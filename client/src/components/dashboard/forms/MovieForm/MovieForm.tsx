import { useState } from "react";
import Modal          from "../../../common/Modal/Modal.tsx";
import TagInput       from "../../../common/TagInput/TagInput.tsx";
import { moviesApi }  from "../../../../api/index.api.ts";
import { showToast }  from "../../../common/Toast/toast.ts";
import type { Movie, CreateMoviePayload, MovieCertificate, MovieReleaseStatus } from "../../../../types/movie.types.ts";
import ImageUpload      from "../../../common/ImageUpload/ImageUpload.tsx";
import MultiImageUpload from "../../../common/MultiImageUpload/MultiImageUpload.tsx";
import "./MovieForm.css";

interface MovieFormProps {
  data:    Movie | null;
  onClose: () => void;
  onSave:  () => void;
}

const CERTIFICATES: MovieCertificate[]  = ["U","UA","A","R","PG-13"];
const STATUSES: MovieReleaseStatus[]    = ["COMING_SOON","RELEASED","BANNED"];
const GENRE_OPTIONS    = ["Action","Comedy","Drama","Horror","Thriller","Romance","Sci-Fi","Fantasy","Animation","Documentary","Crime","Mystery","Adventure","Biography","Musical"];
const LANGUAGE_OPTIONS = ["Hindi","English","Tamil","Telugu","Malayalam","Kannada","Bengali","Punjabi","Marathi","Gujarati"];

type Form = CreateMoviePayload;

const BLANK: Form = {
  name: "", description: "", director: "", casts: [], genre: [],
  languages: [], duration: 120, certificate: "UA",
  releaseDate: "", releaseStatus: "COMING_SOON",
  posterUrl: "", bannerUrl: "", trailerUrl: "", images: [],
};

export default function MovieForm({ data, onClose, onSave }: MovieFormProps) {
  const isEdit = !!data;

  const [form, setForm] = useState<Form>(data ? {
    name:          data.name,
    description:   data.description,
    director:      data.director,
    casts:         data.casts         ?? [],
    genre:         data.genre         ?? [],
    languages:     data.languages     ?? [],
    duration:      data.duration,
    certificate:   data.certificate   ?? "UA",
    releaseDate:   data.releaseDate?.slice(0, 10) ?? "",
    releaseStatus: data.releaseStatus ?? "COMING_SOON",
    posterUrl:     data.posterUrl,
    bannerUrl:     data.bannerUrl     ?? "",
    trailerUrl:    data.trailerUrl,
    images:        data.images        ?? [],
  } : { ...BLANK });

  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm(p => ({ ...p, [k]: v }));

  const validate = (): string | null => {
    if (!form.name.trim())           return "Movie name is required";
    if (!form.description.trim())    return "Description is required";
    if (!form.director.trim())       return "Director is required";
    if (form.casts.length === 0)     return "At least one cast member is required";
    if (form.genre.length === 0)     return "At least one genre is required";
    if (form.languages.length === 0) return "At least one language is required";
    if (!form.duration || form.duration < 1) return "Duration is required";
    if (!form.releaseDate)           return "Release date is required";
    if (!form.posterUrl.trim())      return "Poster URL is required";
    if (!form.trailerUrl.trim())     return "Trailer URL is required";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { showToast(err, "error"); return; }
    setSaving(true);
    try {
      const payload: Partial<Form> = { ...form };
      if (!payload.bannerUrl) delete payload.bannerUrl;
      if (isEdit) await moviesApi.update(data!._id, payload);
      else        await moviesApi.create(form);
      showToast(`Movie ${isEdit ? "updated" : "added"} successfully`);
      onSave();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to save", "error");
    } finally { setSaving(false); }
  };

  return (
    <Modal
      title={isEdit ? "EDIT MOVIE" : "ADD MOVIE"}
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Movie"}
          </button>
        </>
      }
    >
      {/* Basic */}
      <p className="form-section-label">BASIC INFO</p>
      <div className="form-group">
        <label className="form-label">Movie Name *</label>
        <input className="form-input" value={form.name}
          onChange={e => set("name", e.target.value)}
          placeholder="e.g. Kalki 2898-AD" />
      </div>
      <div className="form-group">
        <label className="form-label">Description *</label>
        <textarea className="form-input" rows={3} value={form.description}
          onChange={e => set("description", e.target.value)}
          placeholder="Movie synopsis (min 20 characters)" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Director *</label>
          <input className="form-input" value={form.director}
            onChange={e => set("director", e.target.value)}
            placeholder="Director name" />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (minutes) *</label>
          <input className="form-input" type="number" min={1} value={form.duration}
            onChange={e => set("duration", Number(e.target.value))} />
        </div>
      </div>

      {/* Release */}
      <p className="form-section-label">RELEASE</p>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Release Date *</label>
          <input className="form-input" type="date" value={form.releaseDate}
            onChange={e => set("releaseDate", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Release Status *</label>
          <select className="form-input" value={form.releaseStatus}
            onChange={e => set("releaseStatus", e.target.value as MovieReleaseStatus)}>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Certificate</label>
          <select className="form-input" value={form.certificate}
            onChange={e => set("certificate", e.target.value as MovieCertificate)}>
            {CERTIFICATES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

      </div>

      {/* Cast & Details */}
      <p className="form-section-label">CAST & DETAILS</p>
      <TagInput label="Cast Members *" values={form.casts}
        onChange={v => set("casts", v)} placeholder="Actor name → Enter" />
      <TagInput label="Genre *" values={form.genre}
        onChange={v => set("genre", v)} options={GENRE_OPTIONS}
        placeholder="Or type custom genre" />
      <TagInput label="Languages *" values={form.languages}
        onChange={v => set("languages", v)} options={LANGUAGE_OPTIONS}
        placeholder="Or type custom language" />

      {/* Media */}
      <p className="form-section-label">MEDIA</p>
      <ImageUpload
        label="Poster Image *"
        value={form.posterUrl}
        onChange={url => set("posterUrl", url)}
        folder="cineverse/posters"
        aspectRatio="poster"
      />
      <ImageUpload
        label="Banner Image"
        value={form.bannerUrl ?? ""}
        onChange={url => set("bannerUrl", url)}
        folder="cineverse/banners"
        aspectRatio="banner"
        optional
      />
      <div className="form-group">
        <label className="form-label">Trailer URL *</label>
        <input className="form-input" value={form.trailerUrl}
          onChange={e => set("trailerUrl", e.target.value)}
          placeholder="https://youtube.com/..." />
      </div>

      <MultiImageUpload
        label="Gallery Images"
        images={form.images ?? []}
        onChange={v => set("images", v)}
        folder="cineverse/gallery"
        optional
      />
    </Modal>
  );
}