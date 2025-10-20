import DocsLayout from "./DocsLayout";

const Tokenomics = () => (
  <DocsLayout pageTitle="Tokenomics">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-chatta-cyan">Token: $CHAT</h1>
    <p className="mb-4 text-base md:text-lg text-justify">
      <b>Overview:</b> $CHAT is the native token of Chatta. It enables premium features, rewards early adopters, and helps steer platform governance.
    </p>
    <h2 className="text-xl md:text-2xl font-bold mt-6 mb-2 text-chatta-purple">Token Utility</h2>
    <ul className="list-disc ml-6 space-y-2 text-base md:text-lg text-justify">
      <li>Access to premium analytics and AI insights</li>
      <li>Reduced fees on automated transactions</li>
      <li>Early access to beta features</li>
      <li>Voting on governance proposals</li>
    </ul>
    <h2 className="text-xl md:text-2xl font-bold mt-6 mb-2 text-chatta-purple">Access Model</h2>
    <ul className="list-disc ml-6 space-y-2 text-base md:text-lg text-justify">
      <li>Chatta is free for 24 hours post-launch</li>
      <li>Ongoing usage requires holding a minimum amount of $CHAT</li>
    </ul>
  </DocsLayout>
);

export default Tokenomics; 