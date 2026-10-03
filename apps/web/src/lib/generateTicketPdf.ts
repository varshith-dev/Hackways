// High-resolution client-side PDF ticket generator
// Creates a genuine standard PDF 1.4 file and triggers direct download.

interface TicketPdfData {
  eventTitle: string;
  ticketCode: string;
  tierName: string;
  attendeeName: string;
  attendeeEmail: string;
  timeDisplay: string;
  location: string;
  city?: string;
  qrTarget: string;
  priceFormatted?: string;
  channelName?: string;
}

// Convert a canvas to raw JPEG binary Uint8Array
function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) return reject(new Error("Canvas export failed"));
        const buffer = await blob.arrayBuffer();
        resolve(new Uint8Array(buffer));
      },
      "image/jpeg",
      0.95
    );
  });
}

// Build a valid standard PDF-1.4 file containing the ticket image
function buildPdfFromJpeg(
  jpegBytes: Uint8Array,
  imgWidth: number,
  imgHeight: number
): Uint8Array {
  // Page size: landscape A5-ish (595.28 pt x 420.94 pt)
  const pageWidth = 595.28;
  const pageHeight = 420.94;

  // Scale ticket image to fit nicely centered with margins
  const margin = 28;
  const targetWidth = pageWidth - margin * 2;
  const targetHeight = (targetWidth / imgWidth) * imgHeight;
  const x = margin;
  const y = (pageHeight - targetHeight) / 2;

  // PDF content stream instructions to paint the image
  const contentStream = `q\n${targetWidth.toFixed(2)} 0 0 ${targetHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im1 Do\nQ\n`;
  const contentBytes = new TextEncoder().encode(contentStream);

  const header = new TextEncoder().encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const objects: { id: number; data: Uint8Array }[] = [];

  // 1: Catalog
  objects.push({
    id: 1,
    data: new TextEncoder().encode("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
  });

  // 2: Pages
  objects.push({
    id: 2,
    data: new TextEncoder().encode("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"),
  });

  // 3: Page
  objects.push({
    id: 3,
    data: new TextEncoder().encode(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`
    ),
  });

  // 4: Content Stream
  objects.push({
    id: 4,
    data: new TextEncoder().encode(
      `4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    ),
  });

  // 5: Image XObject (JPEG)
  const imageHeader = new TextEncoder().encode(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  const imageFooter = new TextEncoder().encode("\nendstream\nendobj\n");
  const fullImageObj = new Uint8Array(imageHeader.length + jpegBytes.length + imageFooter.length);
  fullImageObj.set(imageHeader, 0);
  fullImageObj.set(jpegBytes, imageHeader.length);
  fullImageObj.set(imageFooter, imageHeader.length + jpegBytes.length);

  objects.push({
    id: 5,
    data: fullImageObj,
  });

  // Calculate xref offsets
  let currentOffset = header.length;
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(currentOffset);
    currentOffset += obj.data.length;
  }

  // Build xref table
  let xrefStr = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, "0");
    xrefStr += `${offStr} 00000 n \n`;
  }

  const startXref = currentOffset;
  const trailerStr = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const xrefBytes = new TextEncoder().encode(xrefStr);
  const trailerBytes = new TextEncoder().encode(trailerStr);

  // Total size
  const totalLength = currentOffset + xrefBytes.length + trailerBytes.length;
  const pdfBytes = new Uint8Array(totalLength);

  let writePtr = 0;
  pdfBytes.set(header, writePtr);
  writePtr += header.length;

  for (const obj of objects) {
    pdfBytes.set(obj.data, writePtr);
    writePtr += obj.data.length;
  }

  pdfBytes.set(xrefBytes, writePtr);
  writePtr += xrefBytes.length;

  pdfBytes.set(trailerBytes, writePtr);

  return pdfBytes;
}

// Load QR image from high-res service or draw fallback
async function getQrImage(qrTarget: string, size: number): Promise<HTMLImageElement> {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrTarget)}&margin=1&format=png`;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = qrUrl;

  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve(); // continue even if offline
  });

  return img;
}

export async function downloadTicketPdf(data: TicketPdfData): Promise<void> {
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  const W = 1600;
  const H = 760;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Pass outer container with rounded borders
  const margin = 20;
  const cardX = margin;
  const cardY = margin;
  const cardW = W - margin * 2;
  const cardH = H - margin * 2;

  // Rounded pass background
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#e4e4e7";
  ctx.stroke();
  ctx.clip();

  // Stub divider (dashed perforation line)
  const stubW = 460;
  const stubX = cardX + cardW - stubW;

  ctx.fillStyle = "#fafafa";
  ctx.fillRect(stubX, cardY, stubW, cardH);

  // Perforation line
  ctx.beginPath();
  ctx.setLineDash([12, 10]);
  ctx.moveTo(stubX, cardY);
  ctx.lineTo(stubX, cardY + cardH);
  ctx.strokeStyle = "#d4d4d8";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  // Top semicircles for pass ticket cutouts
  ctx.restore();
  ctx.beginPath();
  ctx.arc(stubX, cardY, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e4e4e7";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(stubX, cardY + cardH, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e4e4e7";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw Header / Brand
  ctx.fillStyle = "#09090b";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("HACKWAYS", cardX + 50, cardY + 65);

  ctx.fillStyle = "#71717a";
  ctx.font = "500 16px system-ui, -apple-system, sans-serif";
  ctx.fillText("ADMISSION PASS", cardX + 185, cardY + 65);

  // Tier Badge
  ctx.fillStyle = "#f4f4f5";
  ctx.beginPath();
  ctx.roundRect(cardX + 50, cardY + 95, 220, 36, 18);
  ctx.fill();
  ctx.strokeStyle = "#e4e4e7";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#18181b";
  ctx.font = "bold 15px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.tierName, cardX + 70, cardY + 119);

  // Event Title
  ctx.fillStyle = "#09090b";
  ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
  const title = data.eventTitle.length > 36 ? data.eventTitle.slice(0, 34) + "..." : data.eventTitle;
  ctx.fillText(title, cardX + 50, cardY + 200);

  // Date and Location Section
  ctx.fillStyle = "#27272a";
  ctx.font = "600 20px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.timeDisplay || "Date to be announced", cardX + 50, cardY + 260);

  const loc = [data.location, data.city].filter(Boolean).join(", ");
  ctx.fillStyle = "#52525b";
  ctx.font = "500 18px system-ui, -apple-system, sans-serif";
  ctx.fillText(loc || "Venue announced after RSVP", cardX + 50, cardY + 295);

  // Divider inside main pass
  ctx.beginPath();
  ctx.moveTo(cardX + 50, cardY + 360);
  ctx.lineTo(stubX - 50, cardY + 360);
  ctx.strokeStyle = "#f4f4f5";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Attendee Info
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("ATTENDEE", cardX + 50, cardY + 410);

  ctx.fillStyle = "#09090b";
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.attendeeName, cardX + 50, cardY + 448);

  ctx.fillStyle = "#71717a";
  ctx.font = "500 16px system-ui, -apple-system, sans-serif";
  ctx.fillText(data.attendeeEmail, cardX + 50, cardY + 480);

  // Reference Code
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("TICKET REFERENCE", cardX + 480, cardY + 410);

  ctx.fillStyle = "#09090b";
  ctx.font = "bold 24px monospace";
  ctx.fillText(data.ticketCode, cardX + 480, cardY + 448);

  ctx.fillStyle = "#71717a";
  ctx.font = "500 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("Valid for 1 Entry", cardX + 480, cardY + 480);

  // Footer note
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("Please present this QR code at the event entrance for scanning.", cardX + 50, cardY + cardH - 45);

  // Stub Section (Right)
  const qrSize = 250;
  const qrX = stubX + (stubW - qrSize) / 2;
  const qrY = cardY + 120;

  // Background box for QR
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 20);
  ctx.fill();
  ctx.strokeStyle = "#e4e4e7";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Load and draw QR
  try {
    const qrImg = await getQrImage(data.qrTarget, qrSize);
    if (qrImg.complete && qrImg.naturalWidth > 0) {
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    } else {
      // Draw fallback QR pattern
      ctx.fillStyle = "#09090b";
      ctx.fillRect(qrX + 20, qrY + 20, 70, 70);
      ctx.fillRect(qrX + qrSize - 90, qrY + 20, 70, 70);
      ctx.fillRect(qrX + 20, qrY + qrSize - 90, 70, 70);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX + 35, qrY + 35, 40, 40);
      ctx.fillRect(qrX + qrSize - 75, qrY + 35, 40, 40);
      ctx.fillRect(qrX + 35, qrY + qrSize - 75, 40, 40);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(qrX + 45, qrY + 45, 20, 20);
      ctx.fillRect(qrX + qrSize - 65, qrY + 45, 20, 20);
      ctx.fillRect(qrX + 45, qrY + qrSize - 65, 20, 20);
    }
  } catch {}

  // Stub Code
  ctx.fillStyle = "#09090b";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText(data.ticketCode, stubX + stubW / 2, qrY + qrSize + 65);

  ctx.fillStyle = "#71717a";
  ctx.font = "600 13px system-ui, -apple-system, sans-serif";
  ctx.fillText("OFFICIAL ADMISSION", stubX + stubW / 2, qrY + qrSize + 95);
  ctx.textAlign = "left";

  // Convert to JPEG bytes & wrap into valid PDF-1.4
  const jpegBytes = await canvasToJpegBytes(canvas);
  const pdfBytes = buildPdfFromJpeg(jpegBytes, W, H);

  // Trigger real file download
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanTitle = data.eventTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  link.download = `Hackways_${cleanTitle}_Ticket_${data.ticketCode}.pdf`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
