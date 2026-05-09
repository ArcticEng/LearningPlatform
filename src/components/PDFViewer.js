"use client";
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Self-hosted worker for fastest first-open (copied from pdfjs-dist on postinstall)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Memoised options object — react-pdf warns if you pass a new object on every render
const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// Renders a single page only when it's near the viewport.
// Until then, occupies an estimated-height placeholder so scroll position stays sensible.
const LazyPage = memo(function LazyPage({ pageNumber, width, estimatedHeight, eager }) {
  const [shouldRender, setShouldRender] = useState(eager);
  const ref = useRef(null);

  useEffect(() => {
    if (shouldRender) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          setShouldRender(true);
          io.disconnect();
        }
      },
      // Start rendering ~one screen ahead so pages are ready by the time they're visible
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldRender]);

  return (
    <div
      ref={ref}
      style={{
        marginBottom: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        background: "#fff",
        lineHeight: 0,
        width,
        minHeight: shouldRender ? undefined : estimatedHeight,
      }}
    >
      {shouldRender ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          loading={
            <div style={{ height: estimatedHeight, display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 12 }}>
              Page {pageNumber}…
            </div>
          }
        />
      ) : (
        <div style={{ height: estimatedHeight, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: 12 }}>
          Page {pageNumber}
        </div>
      )}
    </div>
  );
});

export default function PDFViewer({ url, title }) {
  const [numPages, setNumPages] = useState(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
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
    console.error("[PDFViewer] PDF load error:", err);
    const msg = err?.message || err?.name || String(err) || "Unknown error";
    setError(msg);
  }, []);

  // Reset when URL changes (different module selected)
  useEffect(() => { setError(null); setNumPages(null); }, [url]);

  // Estimate page height (A4 portrait ~= width * 1.414); adjust as needed
  const estimatedHeight = Math.round(containerWidth * 1.414);

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
        <div style={{ color: "#fff", padding: 24, textAlign: "center", maxWidth: 480 }}>
          <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600 }}>Could not load PDF in viewer</p>
          <p style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.8, fontFamily: "monospace", wordBreak: "break-word" }}>{error}</p>
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ color: "#fff", textDecoration: "underline", fontSize: 13 }}>
            Open in new tab
          </a>
        </div>
      ) : (
        <Document
          file={url}
          options={PDF_OPTIONS}
          onLoadSuccess={onLoadSuccess}
          onLoadError={onLoadError}
          loading={<div style={{ color: "#fff", padding: 24, fontSize: 14 }}>Loading PDF…</div>}
        >
          {containerWidth > 0 && Array.from({ length: numPages || 0 }, (_, i) => (
            <LazyPage
              key={`page_${i + 1}`}
              pageNumber={i + 1}
              width={containerWidth}
              estimatedHeight={estimatedHeight}
              eager={i === 0}
            />
          ))}
        </Document>
      )}
    </div>
  );
}
