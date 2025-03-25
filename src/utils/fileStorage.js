export const saveDataToFile = async (filename, data) => {
  try {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(filename, jsonData);
    console.log(`Données sauvegardées dans ${filename} :`, data);
  } catch (error) {
    console.error(`Erreur lors de la sauvegarde des données dans ${filename}:`, error);
  }
};

export const loadDataFromFile = async (filename) => {
  try {
    const jsonData = localStorage.getItem(filename);
    if (jsonData) {
      console.log(`Données chargées depuis ${filename} :`, JSON.parse(jsonData));
    } else {
      console.log(`Aucune donnée trouvée dans ${filename}.`);
    }
    return jsonData ? JSON.parse(jsonData) : null;
  } catch (error) {
    console.error(`Erreur lors du chargement des données depuis ${filename}:`, error);
    return null;
  }
};
