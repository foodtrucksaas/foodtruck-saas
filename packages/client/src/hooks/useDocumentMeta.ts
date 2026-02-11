import { useEffect } from 'react';

interface DocumentMeta {
  title?: string;
  description?: string;
  ogImage?: string;
  ogUrl?: string;
  jsonLd?: Record<string, unknown>;
}

function setMetaTag(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function useDocumentMeta({ title, description, ogImage, ogUrl, jsonLd }: DocumentMeta) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);

  useEffect(() => {
    if (!description) return;
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:description', description);
    setMetaTag('name', 'twitter:description', description);
  }, [description]);

  useEffect(() => {
    if (!title) return;
    setMetaTag('property', 'og:title', title);
    setMetaTag('name', 'twitter:title', title);
  }, [title]);

  useEffect(() => {
    if (!ogImage) return;
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('name', 'twitter:image', ogImage);
  }, [ogImage]);

  useEffect(() => {
    if (!ogUrl) return;
    setMetaTag('property', 'og:url', ogUrl);
  }, [ogUrl]);

  // JSON-LD structured data
  useEffect(() => {
    if (!jsonLd) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [jsonLd]);
}
