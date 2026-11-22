import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Rendu Markdown sûr (tableaux GFM pris en charge) : le HTML brut est ignoré (pas de rehype-raw), les liens externes sont isolés. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-qsd">
      <ReactMarkdown
        skipHtml
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>{children}</a>;
          },
          img: ({ src, alt }) => (typeof src === "string" && src.startsWith("https://") ? <img src={src} alt={alt ?? ""} loading="lazy" className="my-4 rounded-xl" /> : null),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
