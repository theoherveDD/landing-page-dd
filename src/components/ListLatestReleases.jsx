import React, { useEffect, useState } from "react";
import { useLocation, useHistory } from "react-router-dom"; // Remplacer useNavigate par useHistory
import { saveDataToFile, loadDataFromFile } from "../utils/fileStorage"; // Importer les fonctions utilitaires
import "./ListLatestReleases.css"; // Importer les styles CSS
import Search from "../assets/search.svg"; // Chemin relatif vers l'icône
import Grid from "../assets/grid.svg"; // Chemin relatif vers l'icône
import List from "../assets/list.svg"; // Chemin relatif vers l'icône

const ListLatestReleases = () => {
  const [releases, setReleases] = useState([]);
  const [filteredReleases, setFilteredReleases] = useState([]); // État pour les données filtrées
  const [filters, setFilters] = useState({}); // État pour les filtres
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Ajouter un état pour les erreurs générales
  const [failedUrls, setFailedUrls] = useState([]); // Ajouter un état pour les URLs échouées
  const [sortConfig, setSortConfig] = useState({ key: "Dates", direction: "desc" }); // Tri par défaut par date (desc)
  const [displayMode, setDisplayMode] = useState("list"); // État pour le mode d'affichage
  const location = useLocation();
  const history = useHistory(); // Remplacer useNavigate par useHistory
  const [windowWidth, setWindowWidth] = useState(window.innerWidth); // État pour la largeur de la fenêtre

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
    const maxAttempts = 15;

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
          console.warn(`Contenu invalide reçu pour ${query}. Ignoré.`);
          return null; // Retourner null si le contenu est invalide
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
      await delay(3000); // Introduire un délai de 1500 ms entre chaque requête
    }
    setFailedUrls(failed);
    return allData;
  };

  const areDataDifferent = (oldData, newData) => {
    if (oldData.length !== newData.length) return true;

    for (let i = 0; i < oldData.length; i++) {
      const oldItem = oldData[i];
      const newItem = newData[i];

      // Comparer uniquement les champs nécessaires pour détecter les différences
      if (
        oldItem.Name !== newItem.Name ||
        oldItem.Artist[0] !== newItem.Artist[0] ||
        oldItem.bpm !== newItem.bpm ||
        oldItem.key !== newItem.key ||
        oldItem.popularity !== newItem.popularity ||
        oldItem.preview !== newItem.preview ||
        oldItem.Dates !== newItem.Dates
      ) {
        return true;
      }
    }
    return false;
  };

  const fetchMondayLinks = async () => {
    try {
      console.log("Fetching download links from Monday...");
      const response = await fetch("https://amethyst-plume-reading.glitch.me/monday"); // URL de l'API Monday
      if (!response.ok) {
        console.error("Erreur lors de la récupération des liens de téléchargement depuis Monday.");
        return {};
      }
      const data = await response.json();
      console.log("Liens de téléchargement récupérés depuis Monday :", data);
      return data; // Retourne un objet contenant les liens de téléchargement
    } catch (error) {
      console.error("Erreur lors de la récupération des données depuis Monday :", error);
      return {};
    }
  };

  const fetchData = async () => {
    const apiUrl = "https://amethyst-plume-reading.glitch.me/storage/landingpage.json";
    let cachedDataCopy = []; // Variable pour stocker une copie réutilisable de cachedData

    try {
      console.log("Tentative de chargement des données depuis l'API...");
      const response = await fetch(apiUrl);
      if (response.ok) {
        const cachedData = await response.json();
        cachedDataCopy = [...cachedData]; // Copier cachedData pour réutilisation
        console.log("Données chargées depuis l'API :", cachedData);
        setReleases(sortByKey(cachedData, "Dates", "desc"));
        setLoading(false);

        console.log("Vérification des nouvelles données...");
        const newData = await fetchDataFromAPI();
        const mondayLinks = await fetchMondayLinks(); // Récupérer les liens de téléchargement depuis Monday
        if (areDataDifferent(cachedData, newData)) {
          console.log("Les données ont changé, mise à jour de l'affichage...");
          const coverArts = await fetchCoverArts(); // Récupérer les cover arts
          updateCache(newData, cachedDataCopy, coverArts, mondayLinks);
        } else {
          console.log("Les données sont identiques, mise à jour uniquement des liens de téléchargement.");
          setReleases((prevReleases) =>
            prevReleases.map((release) => ({
              ...release,
              RadioDownloadLinks: mondayLinks[release.Id] || release.RadioDownloadLinks, // Mettre à jour les liens
            }))
          );
        }
      } else {
        console.warn("Aucune donnée en cache, récupération depuis les sources...");
        const newData = await fetchDataFromAPI();
        const mondayLinks = await fetchMondayLinks(); // Récupérer les liens de téléchargement depuis Monday
        const coverArts = await fetchCoverArts(); // Récupérer les cover arts
        updateCache(newData, cachedDataCopy, coverArts, mondayLinks);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des données depuis l'API :", error);
      const newData = await fetchDataFromAPI();
      const mondayLinks = await fetchMondayLinks(); // Récupérer les liens de téléchargement depuis Monday
      const coverArts = await fetchCoverArts(); // Récupérer les cover arts
      updateCache(newData, cachedDataCopy, coverArts, mondayLinks);
    } finally {
      setLoading(false);
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Fonction pour introduire un délai

  const fetchCoverArts = async () => {
    const coverArtUrls = [
      { url: "https://amethyst-plume-reading.glitch.me/generaldownloaddancingdead", label: "Dancing Dead Records" },
      { url: "https://amethyst-plume-reading.glitch.me/generaldownloaddenhaku", label: "Den Haku Records" },
      { url: "https://amethyst-plume-reading.glitch.me/generaldownloadstyx", label: "Styx Records" },
    ];

    const coverArts = {};
    for (const { url, label } of coverArtUrls) {
      try {
        console.log(`Fetching cover arts from ${url}...`);
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Failed to fetch cover arts for ${label}`);
          continue;
        }
        const data = await response.json();
        data.forEach((item) => {
          coverArts[item.name] = item.cover_url; // Associer le nom de la release à l'URL du cover art
        });
      } catch (error) {
        console.error(`Erreur lors de la récupération des cover arts pour ${label}:`, error);
      }
    }
    return coverArts;
  };

  const normalizeArtists = (artists) => {
    // Séparer les artistes par "&" et nettoyer les espaces
    return artists.flatMap((artist) => artist.split("&").map((a) => a.trim()));
  };

  const updateCache = async (data, cachedDataCopy, coverArts, mondayLinks) => {
    if (data.length > 0) {
      const releasesWithDetails = [];
      for (const release of data) {
        // Normaliser les artistes
        const normalizedArtists = normalizeArtists(release.Artist);

        // Vérifier si le BPM est "Inconnu" dans cachedDataCopy avant de faire une requête
        const cachedRelease = cachedDataCopy.find((item) => item.Id === release.Id);
        if (cachedRelease && cachedRelease.bpm !== "Inconnu") {
          releasesWithDetails.push({
            ...cachedRelease,
            Artist: normalizedArtists, // Mettre à jour les artistes normalisés
            coverArt: release.cover_url || cachedRelease.coverArt || null, // Utiliser directement la clé cover_url
            RadioDownloadLinks: mondayLinks[release.Id] || release.RadioDownloadLinks, // Mettre à jour les liens
          });
          continue; // Passer à la release suivante
        }

        console.log(`Recherche des détails pour ${release.Name} - ${normalizedArtists.join(", ")}...`);

        // Effectuer une requête à l'API Tunebat uniquement si nécessaire
        const tunebatData = await searchTunebat(normalizedArtists[0], release.Name);
        releasesWithDetails.push({
          ...release,
          Artist: normalizedArtists, // Mettre à jour les artistes normalisés
          bpm: tunebatData && tunebatData.b !== "Inconnu" ? tunebatData.b : release.bpm || "Inconnu",
          key: tunebatData && tunebatData.k !== "Inconnu" ? tunebatData.k : release.key || "Inconnu",
          popularity: tunebatData && tunebatData.p !== "Inconnu" ? tunebatData.p : release.popularity || "Inconnu",
          preview: tunebatData && tunebatData.r ? tunebatData.r : release.preview || null,
          Dates: release.Dates || "Inconnu",
          coverArt: release.cover_url || null, // Utiliser directement la clé cover_url
          RadioDownloadLinks: mondayLinks[release.Id] || release.RadioDownloadLinks, // Mettre à jour les liens
        });
        if (!release.cover_url) {
          console.warn(`Cover not found for release: ${release.Name} by ${release.Artist.join(", ")}`);
        }
        await delay(3000); // Introduire un délai de 1500 ms entre chaque requête
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

  // Fonction pour lire les paramètres de l'URL
  const getFiltersFromURL = () => {
    const params = new URLSearchParams(location.search);
    const filters = {};
    for (const [key, value] of params.entries()) {
      filters[key] = value;
    }
    return filters;
  };

  // Fonction pour mettre à jour les paramètres de l'URL
  const updateURLWithFilters = (newFilters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(newFilters)) {
      if (value) params.set(key, value); // Ajouter uniquement les filtres non vides
    }
    history.push({ search: params.toString() }); // Utiliser history.push au lieu de navigate
  };

  // Fonction pour appliquer les filtres aux données
  const applyFilters = () => {
    let filtered = [...releases];
    if (filters.genre) {
      filtered = filtered.filter((release) =>
        release.genre.some((g) => g.toLowerCase().includes(filters.genre.toLowerCase()))
      );
    }
    if (filters.label) {
      filtered = filtered.filter((release) =>
        release.label.toLowerCase().includes(filters.label.toLowerCase())
      );
    }
    if (filters.artist) {
      filtered = filtered.filter((release) =>
        release.Artist.some((artist) => artist.toLowerCase().includes(filters.artist.toLowerCase()))
      );
    }
    if (filters.key) {
      filtered = filtered.filter((release) => release.key === filters.key);
    }
    if (filters.bpm) {
      const [minBpm, maxBpm] = filters.bpm.split("-").map(Number);
      filtered = filtered.filter((release) => release.bpm >= minBpm && release.bpm <= maxBpm);
    }
    if (filters.popularity) {
      const [minPopularity, maxPopularity] = filters.popularity.split("-").map(Number);
      filtered = filtered.filter(
        (release) => release.popularity >= minPopularity && release.popularity <= maxPopularity
      );
    }
    if (filters.title) {
      filtered = filtered.filter((release) =>
        release.Name.toLowerCase().includes(filters.title.toLowerCase())
      );
    }
    setFilteredReleases(filtered);
  };

  // Gestion des changements de filtres
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURLWithFilters(newFilters);
  };

  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
  };

  useEffect(() => {
    // Initialiser les filtres depuis l'URL
    const initialFilters = getFiltersFromURL();
    setFilters(initialFilters);
  }, [location.search]);

  useEffect(() => {
    // Appliquer les filtres chaque fois qu'ils changent
    applyFilters();
  }, [filters, releases]);

  useEffect(() => {
    fetchData(); // Charger les données initiales

    const interval = setInterval(() => {
      console.log("Rafraîchissement des données pour les liens de téléchargement...");
      fetchData(); // Rafraîchir les données toutes les heures
    }, 3600000); // 1 heure = 3600000 ms

    return () => clearInterval(interval); // Nettoyer l'intervalle lors du démontage du composant
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth); // Mettre à jour la largeur de la fenêtre
    };

    window.addEventListener("resize", handleResize); // Ajouter un écouteur d'événements
    return () => window.removeEventListener("resize", handleResize); // Nettoyer l'écouteur lors du démontage
  }, []);

  const sortByKey = (data, key, direction) => {
    return [...data].sort((a, b) => {
      if (!a[key] || !b[key]) return 0; // Gérer les valeurs nulles ou indéfinies

      if (key === "Name") {
        // Tri par le nom de la release (colonne Title)
        if (direction === "asc") return a[key].localeCompare(b[key]);
        return b[key].localeCompare(a[key]);
      }

      if (key === "genre") {
        // Tri par genre (convertir les tableaux en chaînes pour le tri)
        const genreA = Array.isArray(a[key]) ? a[key].join(", ") : a[key];
        const genreB = Array.isArray(b[key]) ? b[key].join(", ") : b[key];
        if (direction === "asc") return genreA.localeCompare(genreB);
        return genreB.localeCompare(genreA);
      }

      if (typeof a[key] === "string" && typeof b[key] === "string") {
        // Tri alphabétique pour les colonnes texte
        if (direction === "asc") return a[key].localeCompare(b[key]);
        return b[key].localeCompare(a[key]);
      }

      if (typeof a[key] === "number" && typeof b[key] === "number") {
        // Tri numérique pour les colonnes numériques
        if (direction === "asc") return a[key] - b[key];
        return b[key] - a[key];
      }

      if (key === "Dates") {
        // Tri par date
        if (direction === "asc") return new Date(a[key]) - new Date(b[key]);
        return new Date(b[key]) - new Date(a[key]);
      }

      return 0; // Aucun tri si le type de données n'est pas géré
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
    <div className="maincontainer">
      <div className="releases-list-container">
      <h2>LISTING OF THE LATEST RELEASES</h2>
        <div className="filters">
          <div>
            {/* Boutons pour basculer entre les modes d'affichage */}
            {window.innerWidth > 1000 && ( // Afficher uniquement si la largeur est supérieure à 1000px
              <div className="display-mode-buttons">
                <button
                  className={displayMode === "list" ? "active" : ""}
                  onClick={() => handleDisplayModeChange("list")}
                >
                  <img src={List} alt="" />
                </button>
                <button
                  className={displayMode === "grid" ? "active" : ""}
                  onClick={() => handleDisplayModeChange("grid")}
                >
                  <img src={Grid} alt="" />
                </button>
              </div>
            )}
            <div className="icon-container">
              <p className="icon">▾</p>
              <select
                value={filters.genre || ""}
                onChange={(e) => handleFilterChange("genre", e.target.value)}
              >
                <option value="">Genre</option>
                {Object.keys(genreColors).map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
            <div className="icon-container">
              <p className="icon">▾</p>
              <select
                value={filters.key || ""}
                onChange={(e) => handleFilterChange("key", e.target.value)}
              >
                <option value="">Key</option>
                {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map((key) => (
                  <optgroup key={key} label={`${key}`}>
                    <option value={`${key} Major`}>{`${key} Major`}</option>
                    <option value={`${key} Minor`}>{`${key} Minor`}</option>
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="icon-container">
              <p className="icon">▾</p>
              <select
                value={filters.bpm || ""}
                onChange={(e) => handleFilterChange("bpm", e.target.value)}
              >
                <option value="">BPM</option>
                <option value="0-60">0-60</option>
                <option value="61-120">61-120</option>
                <option value="121-180">121-180</option>
                <option value="181-240">181-240</option>
              </select>
            </div>
            <div className="icon-container">
              <p className="icon">▾</p>
              <select
                value={filters.popularity || ""}
                onChange={(e) => handleFilterChange("popularity", e.target.value)}
              >
                <option value="">Popularity</option>
                <option value="0-30">0-30</option>
                <option value="31-60">31-60</option>
                <option value="61-100">61-100</option>
              </select>
            </div>
            <div className="icon-container">
              <p className="icon">▾</p>
              <select
                value={filters.label || ""}
                onChange={(e) => handleFilterChange("label", e.target.value)}
              >
                <option value="">Label</option>
                {[...new Set(releases.map((release) => release.label))].map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="icon-container">
              <img className="icon" src={Search} alt="" />
              <input
                type="text"
                placeholder="Filter by artist"
                value={filters.artist || ""}
                onChange={(e) => handleFilterChange("artist", e.target.value)}
              />
            </div>
            <div className="icon-container">
              <img className="icon" src={Search} alt="" />
              <input
                type="text"
                placeholder="Filter by title"
                value={filters.title || ""}
                onChange={(e) => handleFilterChange("title", e.target.value)}
              />
            </div>
          </div>
        </div>
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
            ) : displayMode === "list" ? (
              <table className="releases-table">
                <thead>
                  <tr>
                    <th onClick={() => sortData("Name")}>Title</th>
                    <th></th>
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
                  {filteredReleases.map((release) => (
                    <tr key={release.Id}>
                      <td>
                        {release.coverArt ? ( // Afficher le cover art si disponible
                          <img
                            src={release.coverArt}
                            alt={`${release.Name} cover art`}
                            className="cover-art"
                          />
                        ) : (
                          <span>No cover</span> // Message si le cover art est manquant
                        )}
                      </td>
                      <td className="title"><p>{release.Name}</p><p className="artist">{release.Artist.join(", ")}</p></td>
                      <td>
                        {release.genre.length > 0
                          ? formatGenre(release.genre)
                          : <span style={{ color: "#FFFFFF" }}>UNKNOWN</span>}
                      </td>
                      <td><span className="tag bpm">{release.bpm}</span></td>
                      <td><span className="tag key">{release.key}</span></td>
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
                        {release.RadioDownloadLinks && release.RadioDownloadLinks.length > 0 ? (
                          <a
                            className="download"
                            href={release.RadioDownloadLinks[0]} // Utiliser uniquement le premier lien
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <span className="material-symbols-outlined">download</span>
                            Download
                          </a>
                        ) : (
                          "No links"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="releases-grid">
                {filteredReleases.map((release) => (
                  <div className="release-card" key={release.Id}>
                    {release.coverArt ? (
                      <img
                        src={release.coverArt}
                        alt={`${release.Name} cover art`}
                        className="cover-art"
                      />
                    ) : (
                      <span>No cover</span>
                    )}
                    <h3>{release.Name}</h3>
                    <p className="artist2">{release.Artist.join(", ")}</p>
                    <div className="genre2">
                      {release.genre.length > 0
                        ? formatGenre(release.genre)
                        : <span style={{ color: "#FFFFFF" }}>UNKNOWN</span>}
                    </div>
                    <p className="bpm2">BPM : {release.bpm}</p>
                    <p className="key2">Key : {release.key}</p>
                    <p className="popularity2">Popularity: {release.popularity}</p>
                    <p className="labe2">{release.label}</p>
                    {release.RadioDownloadLinks && release.RadioDownloadLinks.length > 0 ? (
                      <a
                        className="download"
                        href={release.RadioDownloadLinks[0]}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="material-symbols-outlined">download</span>
                        Download
                      </a>
                    ) : (
                      <p>No links</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ListLatestReleases;