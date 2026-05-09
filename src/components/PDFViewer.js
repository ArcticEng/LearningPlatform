"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Pin worker to a CDN matching the installed react-pdf version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export default function PDFViewer({ url, title }) {
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Track container width so each page renders fitted to the available space
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        // Subtract a small gutter so pages don't touch the scrollbar / edges
        setContainerWidth(containerRef.current.clientWidth - 12);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    window.addEventListener("orientationchange", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const onLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setError(null);
  }, []);

  const onLoadError = useCallback((err) => {
    console.error("PDF load error:", err);
    setError(err?.message || "Failed to load PDF");
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: "#525659",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 0",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {error ? (
        <div style={{ color: "#fff", padding: 24, textAlign: "center", maxWidth: 320 }}>
          <p style={{ margin: "0 0 12px", fontSize: 14 }}>Could not load PDF in viewer.</p>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ color: "#fff", textDecoration: "underline", fontSize: 13 }}>
            Open in new tab
          </a>
        </div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={<div style={{ color: "#fff", padding: 24, fontSize: 14 }}>Loading PDF…</div>}
          error={<div style={{ color: "#fff", padding: 24, fontSize: 14 }}>Failed to load PDF.</div>}
        >
          {containerWidth > 0 && Array.from({ length: numPages || 0 }, (_, i) => (
            <div
              key={`page_${i + 1}`}
              style={{
                marginBottom: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                background: "#fff",
                lineHeight: 0,
              }}
            >
              <Page
                pageNumber={i + 1}
                width={containerWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={<div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12 }}>Page {i + 1}…</div>}
              />
            </div>
          ))}
        </Document>
      )}
    </div>
  );
}
