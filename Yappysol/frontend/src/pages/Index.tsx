import React from "react";
import NewHeroSection from "@/components/NewHeroSection";
import MetricsSection from "@/components/MetricsSection";
import FeaturesGrid from "@/components/FeaturesGrid";
import TradingIntelligenceSection from "@/components/TradingIntelligenceSection";
import DeFiAnalyticsSection from "@/components/DeFiAnalyticsSection";
import YappysolWalkthroughSection from "@/components/TikkaWalkthroughSection";
import VollAheadSection from "@/components/VollAheadSection";
import HowItWorks from "@/components/HowItWorks";
import SmartRoutinesSection from "@/components/SmartRoutinesSection";
import LightFastSection from "@/components/LightFastSection";
import PartnersSection from "@/components/PartnersSection";
import BuiltDifferentSection from "@/components/BuiltDifferentSection";
import JoinMovementSection from "@/components/JoinMovementSection";
import Footer from "@/components/Footer";
import { TubelightNavBarDemo } from "@/components/ui/tubelight-navbar-demo";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white overflow-auto hide-scrollbar">
      {/* Tubelight Navigation */}
      <TubelightNavBarDemo />
      
      {/* Content sections following design system */}
      <div className="relative z-10">
        <NewHeroSection />
        <MetricsSection />
        <FeaturesGrid />
        <YappysolWalkthroughSection />
        <TradingIntelligenceSection />
        <DeFiAnalyticsSection />
        <VollAheadSection />
        <HowItWorks />
        <SmartRoutinesSection />
        <LightFastSection />
        <PartnersSection />
        <BuiltDifferentSection />
        <JoinMovementSection />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
