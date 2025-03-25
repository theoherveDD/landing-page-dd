import React, { useEffect, useState } from "react";
import { saveDataToFile, loadDataFromFile } from "../utils/fileStorage"; // Importer les fonctions utilitaires
import "./ListLatestReleases.css"; // Importer les styles CSS

const ListLatestReleases = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Ajouter un état pour les erreurs générales
  const [failedUrls, setFailedUrls] = useState([]); // Ajouter un état pour les URLs échouées
  const [sortConfig, setSortConfig] = useState({ key: "Dates", direction: "desc" }); // Tri par défaut par date (desc)

  const fetchUrls = [
    { url: "https://amethyst-plume-reading.glitch.me/generaldownloaddancingdead", label: "Dancing Dead Records" },
    { url: "https://amethyst-plume-reading.glitch.me/generaldownloaddenhaku", label: "Den Haku Records" },
    { url: "https://amethyst-plume-reading.glitch.me/generaldownloadstyx", label: "Styx Records" },
  ];

  const searchTunebat = async (artist, title) => {
    const query = `${artist} ${title}`;
    const proxyUrl = 'https://api.allorigins.win/get?url=';
    const apiUrl = `https://api.tunebat.com/api/tracks/search?term=${encodeURIComponent(query)}`;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
        if (response.status === 429) {
          // Si l'API retourne un code 429, attendre avant de réessayer
          const retryAfter = (attempts + 1) * 2000; // Délai exponentiel
          console.warn(`API surcharge, réessai dans ${retryAfter / 1000} secondes...`);
          await delay(retryAfter);
          attempts++;
          continue;
        }
        if (!response.ok) throw new Error("Erreur API Tunebat");
        const data = await response.json();

        // Vérifier si le contenu est valide JSON
        if (!data.contents || data.contents.trim().startsWith("<")) {
          throw new Error("Contenu invalide reçu de l'API Tunebat");
        }

        const parsedData = JSON.parse(data.contents);
        console.log(`Données Tunebat pour ${query}:`, parsedData);
        return parsedData.data.items.length > 0 ? parsedData.data.items[0] : null;
      } catch (error) {
        console.error(`Erreur lors de la récupération des données Tunebat pour ${query}:`, error);
        if (attempts >= maxAttempts - 1) return null; // Retourner null après plusieurs échecs
        attempts++;
      }
    }
    return null;
  };

  const formatRelativeDate = (dateString) => {
    if (!dateString || dateString === "Inconnu") return "Inconnu";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    const intervals = [
      { label: "year", seconds: 31536000 },
      { label: "month", seconds: 2592000 },
      { label: "week", seconds: 604800 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
      { label: "second", seconds: 1 },
    ];

    for (const interval of intervals) {
      const count = Math.floor(diffInSeconds / interval.seconds);
      if (count > 0) {
        return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
      }
    }
    return "New release";
  };

  const genreColors = {
    "TRAP": "#FF5733",
    "HARDSTYLE": "#C70039",
    "MAINSTAGE": "#900C3F",
    "HARD TECHNO": "#581845",
    "TECHNO": "#1C2833",
    "PSY TRANCE": "#DAF7A6",
    "HAPPY HARDCORE": "#FFC300",
    "HARD DANCE": "#FF5733",
    "ELECTRO HOUSE": "#33FF57",
    "DRUM & BASS": "#33C4FF",
    "TECH HOUSE": "#FF33A6",
    "DANCE": "#FF8C33",
    "BASS HOUSE": "#8C33FF",
    "HOUSE": "#338CFF",
    "ELECTRONICA": "#33FF8C",
    "ELECTRO": "#FF338C",
    "DUBSTEP": "#F24637",
    "SYNTHWAVE": "#FA8072",
    "ELECTRO POP": "#FFD700",
    "MIDTEMPO": "#FF6347",
    "FUTURE BASS": "#FF4500",
  };

  const formatGenre = (genres) => {
    const separators = ["/", ",", "|"]; // Liste des séparateurs possibles
    const splitGenres = (genre) => {
      for (const separator of separators) {
        if (genre.includes(separator)) {
          return genre.split(separator).map((g) => g.trim()); // Séparer et nettoyer les genres
        }
      }
      return [genre]; // Retourner le genre tel quel s'il n'y a pas de séparateur
    };

    const allGenres = genres.flatMap((genre) => splitGenres(genre)); // Diviser les genres complexes en plusieurs genres simples

    return allGenres.map((genre) => {
      const upperGenre = genre.toUpperCase();
      const color = genreColors[upperGenre] || "#0F0F0F"; // Couleur par défaut si le genre n'est pas défini

      return (
        <span className="tag" key={upperGenre} style={{ backgroundColor: color, padding: "2px 5px", borderRadius: "5px", margin: "2px" }}>
          {upperGenre || ""}
        </span>
      );
    });
  };

  const getPopularityColor = (popularity) => {
    if (popularity >= 0 && popularity < 30) return "#FF0000"; // Rouge
    if (popularity >= 30 && popularity < 60) return "#C36A18"; // Orange
    if (popularity >= 60 && popularity <= 100) return "#24A11E"; // Vert
    return "#FFFFFF"; // Couleur par défaut
  };

  const fetchDataFromAPI = async () => {
    const failed = [];
    const allData = [];
    for (const { url, label } of fetchUrls) {
      try {
        console.log(`Fetching data from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) {
          failed.push({ url, status: response.status });
          continue;
        }
        const data = await response.json();
        allData.push(...data.map(item => ({ ...item, label })));
      } catch (error) {
        console.error(`Erreur lors de la récupération des données pour ${url}:`, error);
        failed.push({ url, status: "Fetch error" });
      }
      await delay(2500); // Introduire un délai de 1500 ms entre chaque requête
    }
    setFailedUrls(failed);
    return allData;
  };

  const areDataDifferent = (oldData, newData) => {
    if (oldData.length !== newData.length) return true;
    for (let i = 0; i < oldData.length; i++) {
      if (JSON.stringify(oldData[i]) !== JSON.stringify(newData[i])) return true;
    }
    return false;
  };

  const fetchData = async () => {
    const apiUrl = "https://amethyst-plume-reading.glitch.me/storage/landingpage.json";
    try {
      console.log("Tentative de chargement des données depuis l'API...");
      const response = await fetch(apiUrl);
      if (response.ok) {
        const cachedData = await response.json();
        console.log("Données chargées depuis l'API :", cachedData);
        setReleases(sortByKey(cachedData, "Dates", "desc"));
        setLoading(false);

        console.log("Vérification des nouvelles données...");
        const newData = await fetchDataFromAPI();
        if (areDataDifferent(cachedData, newData)) {
          console.log("Les données ont changé, mise à jour de l'affichage...");
          updateCache(newData);
        } else {
          console.log("Les données sont identiques, aucune mise à jour nécessaire.");
        }
      } else {
        console.warn("Aucune donnée en cache, récupération depuis les sources...");
        const newData = await fetchDataFromAPI();
        updateCache(newData);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données depuis l'API :", error);
      const newData = await fetchDataFromAPI();
      updateCache(newData);
    } finally {
      setLoading(false);
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Fonction pour introduire un délai

  const updateCache = async (data) => {
    if (data.length > 0) {
      const releasesWithDetails = [];
      for (const release of data) {
        // Ne pas effectuer de requête API si les informations sont déjà présentes
        if (release.bpm && release.key && release.popularity && release.preview) {
          releasesWithDetails.push(release);
          continue;
        }

        const tunebatData = await searchTunebat(release.Artist[0], release.Name);
        releasesWithDetails.push({
          ...release,
          bpm: tunebatData && tunebatData.b !== "Inconnu" ? tunebatData.b : release.bpm || "Inconnu",
          key: tunebatData && tunebatData.k !== "Inconnu" ? tunebatData.k : release.key || "Inconnu",
          popularity: tunebatData && tunebatData.p !== "Inconnu" ? tunebatData.p : release.popularity || "Inconnu",
          preview: tunebatData && tunebatData.r ? tunebatData.r : release.preview || null,
          Dates: release.Dates || "Inconnu",
        });
        await delay(1500); // Introduire un délai de 1500 ms entre chaque requête
      }

      console.log("Mise à jour du cache avec les nouvelles données...");
      await fetch("https://amethyst-plume-reading.glitch.me/storage/landingpage.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(releasesWithDetails),
      });
      setReleases(sortByKey(releasesWithDetails, "Dates", "desc"));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortByKey = (data, key, direction) => {
    return [...data].sort((a, b) => {
      if (!a[key] || !b[key]) return 0; // Gérer les valeurs nulles ou indéfinies
      if (direction === "asc") return new Date(a[key]) - new Date(b[key]);
      return new Date(b[key]) - new Date(a[key]);
    });
  };

  const sortData = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    const sortedReleases = sortByKey(releases, key, direction);
    setReleases(sortedReleases);
  };

  return (
    <div className="releases-list-container">
      {loading ? (
        <p className="loading-message">Loading releases...</p>
      ) : (
        <>
          {failedUrls.length > 0 && (
            <div className="error-messages">
              <h2>Errors during loading:</h2>
              <ul>
                {failedUrls.map(({ url, status }, index) => (
                  <li key={index}>
                    <strong>URL:</strong> {url} - <strong>Error:</strong> {status}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error ? (
            <p className="error-message">{error}</p>
          ) : (
            <table className="releases-table">
              <thead>
                <tr>
                  <th onClick={() => sortData("Name")}>Title</th>
                  <th onClick={() => sortData("genre")}>Genre</th>
                  <th onClick={() => sortData("bpm")}>BPM</th>
                  <th onClick={() => sortData("key")}>Key</th>
                  <th onClick={() => sortData("Dates")}>Release Date</th>
                  <th onClick={() => sortData("popularity")}>Popularity</th>
                  <th onClick={() => sortData("label")}>Label</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {releases.map((release) => (
                  <tr key={release.Id}>
                    <td className="title">{release.Name}</td>
                    <td>
                      {release.genre.length > 0
                        ? formatGenre(release.genre)
                        : <span style={{ color: "#FFFFFF" }}>UNKNOWN</span>}
                    </td>
                    <td><span className="tag bpm">{release.bpm}</span></td>
                    <td><span  className="tag key">{release.key}</span></td>
                    <td>{formatRelativeDate(release.Dates)}</td>
                    <td>
                      <span
                        className="tag popularity"
                        style={{ backgroundColor: getPopularityColor(release.popularity) }}
                      >
                        {release.popularity}
                      </span>
                    </td>
                    <td>{release.label}</td>
                    <td>
                      {release.RadioDownloadLinks ? (
                        <ul>
                          {release.RadioDownloadLinks.map((link, index) => (
                            <li key={index}>
                              <a className="download" href={link} target="_blank" rel="noopener noreferrer">
                              <span class="material-symbols-outlined">
                              download
                              </span>
                                Download
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "No links"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default ListLatestReleases;