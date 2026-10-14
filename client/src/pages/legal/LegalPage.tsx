import { Link, useParams } from "react-router-dom";
import AppNavbar from "../../components/common/Navbar/Navbar.tsx";
import { LEGAL, LEGAL_UPDATED } from "./legalDocs.ts";
import "./LegalPage.css";

const TABS = [["refunds", "Refunds"], ["terms", "Terms"], ["privacy", "Privacy"]] as const;

export default function LegalPage() {
  const { doc = "terms" } = useParams<{ doc: string }>();
  const page = LEGAL[doc] ?? LEGAL.terms;
  return (
    <div className="page-wrapper">
      <div className="grain" />
      <AppNavbar />
      <article className="container lg">
        <nav className="lg-tabs" aria-label="Policies">
          {TABS.map(([k, label]) => <Link key={k} to={`/legal/${k}`} className={LEGAL[doc] === LEGAL[k] ? "active" : ""}>{label}</Link>)}
        </nav>
        <h1 className="lg-title">{page.title}</h1>
        <p className="lg-updated">Last updated {LEGAL_UPDATED}</p>
        <p className="lg-intro">{page.intro}</p>
        {page.sections.map(s => (
          <section key={s.h} className="lg-section">
            <h2>{s.h}</h2>
            {s.p.length > 1 ? <ul>{s.p.map(x => <li key={x}>{x}</li>)}</ul> : <p>{s.p[0]}</p>}
          </section>
        ))}
        <p className="lg-help">Questions? <Link to="/help">Visit the help centre</Link>.</p>
      </article>
    </div>
  );
}
