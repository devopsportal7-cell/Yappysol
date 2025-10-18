import DocsLayout from "./DocsLayout";

const Links = () => (
  <DocsLayout pageTitle="Links">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-chatta-cyan">Links</h1>
    <ul className="space-y-4 text-base md:text-lg text-justify">
      <li><b>App:</b> <a href="https://chatta.fun" className="text-chatta-cyan underline hover:glow" target="_blank" rel="noopener noreferrer">https://chatta.fun</a></li>
      <li><b>Docs:</b> <a href="https://chatta.fun/docs" className="text-chatta-cyan underline hover:glow" target="_blank" rel="noopener noreferrer">https://chatta.fun/docs</a></li>
      <li><b>Community:</b> <a href="https://x.com/solchatta" className="text-chatta-cyan underline hover:glow" target="_blank" rel="noopener noreferrer">https://x.com/solchatta</a></li>
    </ul>
  </DocsLayout>
);

export default Links; 