import { loadEnrichedPayslip } from '../src/lib/payroll/load-enriched-payslip.ts';
const result = await loadEnrichedPayslip({ payslipId: 'cmp97b8qt0001lezc2yh9ybs7', ownerUserId: 'cmp330ivr000amhx4i7vzrnyw' });
if (!result) { console.error('NOT FOUND'); process.exit(1); }
console.log('Loaded OK:', { id: result.id, bulletin: result.bulletinNumber, lines: result.lines.length });
const { renderToBuffer } = await import('@react-pdf/renderer');
const { createElement } = await import('react');
const { PayslipPDF } = await import('../src/components/payroll/PayslipPDF.tsx');
try {
  const buf = await renderToBuffer(createElement(PayslipPDF, { payslip: result }));
  console.log('PDF rendered, bytes:', buf.length);
} catch (e) {
  console.error('PDF ERROR:', e.message);
  console.error(e.stack?.slice(0, 1500));
  process.exit(1);
}
