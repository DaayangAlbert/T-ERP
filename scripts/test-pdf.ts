import { loadEnrichedPayslip } from "../src/lib/payroll/load-enriched-payslip";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { PayslipPDF } from "../src/components/payroll/PayslipPDF";
import { writeFileSync } from "node:fs";

(async () => {
  const result = await loadEnrichedPayslip({
    payslipId: "cmp97b8qt0001lezc2yh9ybs7",
    ownerUserId: "cmp330ivr000amhx4i7vzrnyw",
  });
  if (!result) { console.error("NOT FOUND"); process.exit(1); }
  try {
    const buf = await renderToBuffer(createElement(PayslipPDF, { payslip: result }) as any);
    writeFileSync("/tmp/test-output.pdf", buf);
    console.log("PDF OK · bytes:", buf.length, "· file: /tmp/test-output.pdf");
  } catch (e: any) {
    console.error("PDF FAILED:", e.message);
    console.error(e.stack?.slice(0, 1500));
    process.exit(1);
  }
})();
