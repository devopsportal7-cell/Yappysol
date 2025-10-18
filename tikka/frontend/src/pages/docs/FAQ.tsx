import DocsLayout from "./DocsLayout";

const FAQ = () => (
  <DocsLayout pageTitle="FAQ">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-chatta-cyan">FAQ</h1>
    <ul className="space-y-4 text-base md:text-lg text-justify">
      <li><b>What is Chatta?</b> An AI interface to interact with the Solana blockchain.</li>
      <li><b>How much does Chatta cost?</b> Free for 24 hours after launch, then requires holding $CHAT.</li>
      <li><b>What does $CHAT do?</b> Unlocks premium tools, faster routing, and beta feature access.</li>
      <li><b>Is there a free version?</b> Yes, for 24 hours.</li>
      <li><b>Which chains does Chatta support?</b> Solana-only (for now).</li>
      <li><b>Can I launch tokens with Chatta?</b> Yes, via pump.fun integration.</li>
      <li><b>Is Chatta secure?</b> Transactions are simulated before signing; all actions require wallet confirmation.</li>
      <li><b>Can I build on Chatta?</b> Open-source modules and agent SDKs are coming.</li>
    </ul>
  </DocsLayout>
);

export default FAQ; 