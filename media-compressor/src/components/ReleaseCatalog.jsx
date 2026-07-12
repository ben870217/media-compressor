import { useEffect, useState } from 'react';

const assetLabels = [
  ['setupUrl', '安裝版 EXE（建議）'],
  ['portableUrl', '免安裝 EXE'],
  ['pwaZipUrl', '下載 PWA ZIP'],
  ['checksumUrl', 'SHA-256 checksum'],
  ['releaseNotesUrl', 'Release notes'],
];

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium' }).format(new Date(value));
}

export default function ReleaseCatalog({ onBack }) {
  const [state, setState] = useState({ status: 'loading', releases: [] });

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}releases.json`)
      .then((response) => {
        if (!response.ok) throw new Error('無法載入發行目錄');
        return response.json();
      })
      .then((catalog) => {
        if (active) setState({ status: 'ready', releases: catalog.releases || [] });
      })
      .catch(() => {
        if (active) setState({ status: 'error', releases: [] });
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="apple-main-gallery release-catalog" aria-labelledby="release-catalog-title">
      <button className="catalog-back" type="button" onClick={onBack}>← 返回壓縮工具</button>
      <h2 id="release-catalog-title" className="apple-gallery-title">版本與下載</h2>
      <p className="apple-gallery-desc">選擇固定的正式版本，下載 Windows EXE 或開啟對應版本安裝 PWA。</p>
      {state.status === 'loading' && <p role="status">正在載入正式發行目錄…</p>}
      {state.status === 'error' && <p role="alert">目前無法載入發行目錄。請檢查網路後重試。</p>}
      {state.status === 'ready' && state.releases.length === 0 && <p>目前尚未有正式 Release。</p>}
      <div className="release-list">
        {state.releases.map((release) => (
          <article className="release-card" key={release.version}>
            <div>
              <h3>v{release.version}</h3>
              <p>{formatDate(release.publishedAt)}</p>
              {release.summary && <p>{release.summary}</p>}
            </div>
            <div className="release-actions">
              <a className="release-install" href={release.pwaInstallUrl}>開啟並安裝 PWA</a>
              {assetLabels.map(([key, label]) => release[key] && <a key={key} href={release[key]}>{label}</a>)}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
