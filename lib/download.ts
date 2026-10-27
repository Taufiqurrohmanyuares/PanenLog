const TYPES: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  json: "application/json",
  csv: "text/csv;charset=utf-8",
};

/** Memicu unduhan berkas di browser. */
export function download(filename: string, data: BlobPart) {
  const ext = filename.split(".").pop() ?? "";
  const url = URL.createObjectURL(new Blob([data], { type: TYPES[ext] ?? "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
