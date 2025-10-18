import React from 'react';

// Ensure this import path is correct for your project structure
import SectionWithMockup from "@/components/ui/section-with-mockup"

// Data for the first section (default layout)
const exampleData1 = {
    title: (
        <>
            Intelligence,
            <br />
            delivered to you.
        </>
    ),
    description: (
        <>
            Get a tailored Monday morning brief directly in
            <br />
            your inbox, crafted by your virtual personal
            <br />
            analyst, spotlighting essential watchlist stories
            <br />
            and earnings for the week ahead.
        </>
    ),
    primaryImageSrc: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=600&fit=crop&crop=center',
    secondaryImageSrc: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop&crop=center',
};

// Changed from 'export default function ...' to 'export function ...'
export function SectionMockupDemoPage() {
    return (
        <SectionWithMockup
            title={exampleData1.title}
            description={exampleData1.description}
            primaryImageSrc={exampleData1.primaryImageSrc}
            secondaryImageSrc={exampleData1.secondaryImageSrc}
        />
    );
}




