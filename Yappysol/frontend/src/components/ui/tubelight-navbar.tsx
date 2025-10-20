"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavigate, useLocation } from "react-router-dom"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  external?: boolean
  target?: string
  rel?: string
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<string>("")
  const [isMobile, setIsMobile] = useState(false)
  
  // Set active tab based on current location
  useEffect(() => {
    // Find matching item or default to first item
    const currentPath = location.pathname;
    // If on any /docs route, set Docs as active
    if (currentPath.startsWith('/docs')) {
      setActiveTab('Docs');
      return;
    }
    const matchingItem = items.find(item => {
      // For hash routes on homepage
      if (!item.external && item.url.startsWith('#') && currentPath === '/') {
        return true;
      }
      // For other routes
      return !item.external && item.url === currentPath;
    });
    setActiveTab(matchingItem?.name || items[0].name);
  }, [location, items])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleNavClick = (item: NavItem, event: React.MouseEvent) => {
    // For external links, let the browser handle the navigation
    if (item.external) {
      // Do not prevent default; let the browser handle target="_blank"
      return;
    }

    setActiveTab(item.name)
    
    // Handle navigation differently based on URL type
    if (item.url.startsWith('#')) {
      // If we're not on homepage and trying to navigate to a section
      if (location.pathname !== '/') {
        navigate('/')
        // Allow the navigation to complete before scrolling
        setTimeout(() => {
          const element = document.querySelector(item.url)
          element?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        // Direct scroll if already on homepage
        const element = document.querySelector(item.url)
        element?.scrollIntoView({ behavior: 'smooth' })
      }
      event.preventDefault()
    } else {
      // Regular page navigation
      navigate(item.url)
    }
  }

  return (
    <div
      className={cn(
        "relative z-50",
        className,
      )}
    >
      <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 backdrop-blur-sm py-1 px-1 rounded-full shadow-sm">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name

          return (
            <a
              key={item.name}
              href={item.url}
              onClick={(e) => handleNavClick(item, e)}
              target={item.target}
              rel={item.rel}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-4 py-1.5 rounded-full transition-colors",
                "text-foreground/80 hover:text-primary",
                isActive && "bg-muted text-primary",
              )}
            >
              <span className="hidden md:inline flex items-center">
                {item.name}
              </span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                    <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
