import DocsLayout from "./DocsLayout";

const Community = () => (
  <DocsLayout pageTitle="Community">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-chatta-cyan">Community & Open Source</h1>
    <p className="mb-4 text-base md:text-lg text-justify">
      <b>GitHub:</b> Chatta's core will be progressively open-sourced. Devs can propose new modules, contribute wallet adapters or toolkits, help build agent capabilities.
    </p>
    <h2 className="text-xl md:text-2xl font-bold mt-6 mb-2 text-chatta-purple">Governance</h2>
    <p className="mb-4 text-base md:text-lg text-justify">
      Community voting (via $CHAT) will steer roadmaps, feature unlocks, and treasury usage.
    </p>
    <h2 className="text-xl md:text-2xl font-bold mt-6 mb-2 text-chatta-purple">Community Channels</h2>
    <ul className="list-disc ml-6 space-y-2 text-base md:text-lg text-justify">
      <li>Twitter/X: <a href="https://x.com/solchatta" className="text-chatta-cyan underline hover:glow" target="_blank" rel="noopener noreferrer">https://x.com/solchatta</a></li>
      <li>Discord: Coming soon</li>
    </ul>
  </DocsLayout>
);

export default Community; 