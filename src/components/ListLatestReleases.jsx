import React, { useEffect, useState } from "react";

const ListLatestReleases = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fonction pour rechercher les détails via l'API Tunebat
  const searchTunebat = async (artist, title) => {
    const query = `${artist} ${title}`;
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const apiUrl = `https://api.tunebat.com/api/tracks/search?term=${encodeURIComponent(query)}`;
    const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
    const data = await response.json();
    const parsedData = JSON.parse(data.contents);
    return parsedData.data.items.length > 0 ? parsedData.data.items[0] : null; // Retourner le premier résultat
  };

  useEffect(() => {
    // Récupérer les données du backend
    fetch("https://amethyst-plume-reading.glitch.me/generaldownload")
      .then(response => response.json())
      .then(async (data) => {
        const releasesWithDetails = await Promise.all(
          data.map(async (release) => {
            // Ajouter les informations de TuneBat pour chaque release
            const tunebatData = await searchTunebat(release.Artist[0], release.Name);
            return {
              ...release,
              bpm: tunebatData ? tunebatData.b : "Inconnu",
              key: tunebatData ? tunebatData.k : "Inconnu",
              popularity: tunebatData ? tunebatData.p : "Inconnu",
              label: tunebatData ? tunebatData.an : "Inconnu",
              preview: tunebatData ? tunebatData.r : null,
            };
          })
        );
        setReleases(releasesWithDetails);
        setLoading(false);
      })
      .catch(error => {
        console.error("Erreur lors du chargement des données :", error);
        setLoading(false);
      });
  }, []);

  return (
    <div className="releases-list">
      <h1>Dernières Sorties</h1>
      {loading ? (
        <p>Chargement des sorties...</p>
      ) : (
        <ul>
          {releases.map((release) => (
            <li key={release.Id} className="release-item">
              <h2>{release.Name}</h2>
              <p><strong>Date de sortie:</strong> {release.Dates}</p>
              <p><strong>Artiste(s):</strong> {release.Artist.join(", ")}</p>
              <p><strong>Genre:</strong> {release.genre.join(", ") || "Inconnu"}</p>
              <p><strong>BPM:</strong> {release.bpm}</p>
              <p><strong>Key:</strong> {release.key}</p>
              <p><strong>Popularité:</strong> {release.popularity}</p>
              <p><strong>Label:</strong> {release.label}</p>

              {release.preview ? (
                <div>
                  <strong>Aperçu :</strong>
                  <ul>
                    {release.preview.map((link, index) => (
                      <li key={index}>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          Écouter
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Aucun aperçu disponible.</p>
              )}

              {release.RadioDownloadLinks ? (
                <div>
                  <strong>Liens de téléchargement :</strong>
                  <ul>
                    {release.RadioDownloadLinks.map((link, index) => (
                      <li key={index}>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          Télécharger
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p>Aucun lien de téléchargement disponible.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ListLatestReleases;