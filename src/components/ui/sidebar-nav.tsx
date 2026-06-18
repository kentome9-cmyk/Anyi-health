'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown } from '@/lib/icons';

interface NavItem {
  name: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

interface SidebarNavProps {
  items: NavItem[];
  pathname: string | null;
}

function findBestMatch(items: NavItem[], pathname: string | null): { activeHref: string | null; parentHasActiveChild: Set<string> } {
  if (!pathname) return { activeHref: null, parentHasActiveChild: new Set() };

  let bestHref: string | null = null;
  let bestLength = -1;
  const parentHasActiveChild = new Set<string>();

  function checkItems(items: NavItem[], parentName?: string) {
    for (const item of items) {
      if (item.href) {
        const matches = pathname === item.href || pathname.startsWith(item.href + '/');
        if (matches) {
          const len = item.href.length;
          if (len > bestLength) {
            bestLength = len;
            bestHref = item.href;
          }
        }
      }
      if (item.children && item.children.length > 0) {
        const hasActiveChild = item.children.some(
          child => child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))
        );
        if (hasActiveChild) {
          parentHasActiveChild.add(item.name);
        }
        checkItems(item.children, item.name);
      }
    }
  }

  checkItems(items);
  return { activeHref: bestHref, parentHasActiveChild };
}

export function SidebarNav({ items, pathname }: SidebarNavProps) {
  const { activeHref, parentHasActiveChild } = findBestMatch(items, pathname);
  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <NavMenuItem
          key={index}
          item={item}
          pathname={pathname}
          activeHref={activeHref}
          defaultOpen={parentHasActiveChild.has(item.name) || (item.href ? pathname === item.href || pathname?.startsWith(item.href + '/') : false)}
        />
      ))}
    </div>
  );
}

function NavMenuItem({ item, pathname, activeHref, defaultOpen = false }: { item: NavItem; pathname: string | null; activeHref: string | null; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const hasChildren = item.children && item.children.length > 0;

  const isActive = item.href === activeHref;
  const childActive = hasChildren && item.children?.some(child => child.href === activeHref);

  useEffect(() => {
    if (childActive && !isOpen) {
      setIsOpen(true);
    }
  }, [childActive, isOpen]);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors cursor-pointer"
          style={{
            backgroundColor: childActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: childActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
            fontWeight: childActive ? 500 : 400,
          }}
          onMouseEnter={(e) => {
            if (!childActive) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!childActive) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            }
          }}
        >
          {item.icon && <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />}
          <span className="flex-1 text-left">{item.name}</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-screen' : 'max-h-0'}`}>
          <div className="ml-4 mt-1 space-y-1">
            {item.children?.map((child, idx) => (
              <NavMenuItem key={idx} item={child} pathname={pathname} activeHref={activeHref} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={item.href || '#'}>
      <span
        className="flex items-center px-3 py-2 text-sm rounded-md transition-colors"
        style={{
          backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
          color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
          fontWeight: isActive ? 500 : 400,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#ffffff';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }
        }}
      >
        {item.icon && <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />}
        {item.name}
      </span>
    </Link>
  );
}
