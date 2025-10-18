import React from 'react';
import SectionWithMockup from "@/components/ui/section-with-mockup";

const DeFiAnalyticsSection = () => {
    const analyticsData = {
        title: (
            <>
                DeFi Analytics,
                <br />
                simplified.
            </>
        ),
        description: (
            <>
                Track your portfolio performance with
                <br />
                intelligent analytics powered by AI.
                <br />
                Understand yield farming opportunities,
                <br />
                liquidity pools, and DeFi trends.
            </>
        ),
        // Using DeFi/analytics related Unsplash images
        primaryImageSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center&auto=format&q=80',
        secondaryImageSrc: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop&crop=center&auto=format&q=80',
    };

    return (
        <SectionWithMockup
            title={analyticsData.title}
            description={analyticsData.description}
            primaryImageSrc={analyticsData.primaryImageSrc}
            secondaryImageSrc={analyticsData.secondaryImageSrc}
            reverseLayout={true}
        />
    );
};

export default DeFiAnalyticsSection;




