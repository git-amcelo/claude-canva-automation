const API_BASE = "https://api.canva.com/rest/v1";
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 90_000;

export interface ImportedDesign {
  designId: string;
  editUrl: string;
}

interface ImportJob {
  id: string;
  status: "in_progress" | "success" | "failed";
  result?: { designs?: { id: string; urls?: { edit_url?: string; view_url?: string } }[] };
  error?: { message?: string; code?: string };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Uploads a PPTX to Canva's Design Import API and polls the job until the
 * design exists. The PPTX text boxes become real, editable Canva text.
 */
export async function importPptxAsDesign(pptx: Buffer, title: string, accessToken: string): Promise<ImportedDesign> {
  const createRes = await fetch(`${API_BASE}/imports`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Import-Metadata": JSON.stringify({
        title_base64: Buffer.from(title, "utf-8").toString("base64"),
        mime_type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    },
    body: new Uint8Array(pptx),
  });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    throw new Error(`Canva import failed (HTTP ${createRes.status}): ${JSON.stringify(createJson)}`);
  }

  let job: ImportJob = createJson.job;
  if (!job?.id) throw new Error(`Canva import returned an unexpected response: ${JSON.stringify(createJson)}`);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (job.status === "in_progress") {
    if (Date.now() > deadline) throw new Error("Canva import timed out — try again.");
    await sleep(POLL_INTERVAL_MS);
    const pollRes = await fetch(`${API_BASE}/imports/${job.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const pollJson = await pollRes.json().catch(() => ({}));
    if (!pollRes.ok) {
      throw new Error(`Canva import status check failed (HTTP ${pollRes.status}): ${JSON.stringify(pollJson)}`);
    }
    job = pollJson.job ?? job;
  }

  if (job.status !== "success") {
    throw new Error(`Canva import failed: ${job.error?.message ?? job.error?.code ?? "unknown error"}`);
  }

  const design = job.result?.designs?.[0];
  if (!design?.id) throw new Error("Canva import succeeded but returned no design.");
  return {
    designId: design.id,
    editUrl: design.urls?.edit_url ?? `https://www.canva.com/design/${design.id}/edit`,
  };
}
