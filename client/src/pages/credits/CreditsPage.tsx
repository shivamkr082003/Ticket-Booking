import AppNavbar from "../../components/common/Navbar/Navbar.tsx";
import { PHOTO_CREDITS } from "../../constants/photoCredits.ts";

// Attribution for bundled stock photography (required by the CC BY / CC BY-SA licences)
export default function CreditsPage() {
  return (
    <div className="page-wrapper">
      <AppNavbar />
      <div className="container" style={{ padding: "48px 32px 80px", maxWidth: 960 }}>
        <p className="sec-eyebrow">Attribution</p>
        <h1 className="sec-title" style={{ marginBottom: 12 }}>PHOTO CREDITS</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginBottom: 28, maxWidth: 640 }}>
          Theatres that haven't uploaded their own photos are shown with representative images from
          Wikimedia Commons. Each image is used under the licence listed below; resized copies are
          shared under the same licence.
        </p>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead><tr><th>Photo</th><th>Author</th><th>Licence</th><th>Source</th></tr></thead>
            <tbody>
              {PHOTO_CREDITS.map(c => (
                <tr key={c.file}>
                  <td>
                    <div className="cell-movie">
                      <img src={`/images/cinema/${c.file}`} alt="" loading="lazy" style={{ width: 64, height: 40 }} />
                      <strong>{c.title.replace(/\.(jpe?g|png)$/i, "")}</strong>
                    </div>
                  </td>
                  <td>{c.author || "Unknown"}</td>
                  <td>{c.licenseUrl ? <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="dash-link">{c.license}</a> : c.license}</td>
                  <td><a href={c.source} target="_blank" rel="noreferrer" className="dash-link">Wikimedia Commons ↗</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
