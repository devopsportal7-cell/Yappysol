import React from 'react';
import SectionWithMockup from "@/components/ui/section-with-mockup";

const TradingIntelligenceSection = () => {
    const tradingData = {
        title: (
            <>
                Trading Intelligence,
                <br />
                delivered to you.
            </>
        ),
        description: (
            <>
                Get real-time market insights directly in
                <br />
                your chat, crafted by Tikka's AI analyst,
                <br />
                spotlighting essential token movements
                <br />
                and trading opportunities for the day ahead.
            </>
        ),
        // Using trading/crypto related Unsplash images
        primaryImageSrc: 'https://images.unsplash.com/photo-1642790105077-2c0b869c4d5b?w=800&h=600&fit=crop&crop=center&auto=format&q=80',
        secondaryImageSrc: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=600&fit=crop&crop=center&auto=format&q=80',
    };

    return (
        <SectionWithMockup
            title={tradingData.title}
            description={tradingData.description}
            primaryImageSrc={tradingData.primaryImageSrc}
            secondaryImageSrc={tradingData.secondaryImageSrc}
        />
    );
};

export default TradingIntelligenceSection;




