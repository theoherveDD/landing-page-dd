import React from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import ListLatestReleases from "./components/ListLatestReleases";

const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={ListLatestReleases} />
        {/* Ajoutez d'autres routes ici si nécessaire */}
      </Switch>
    </Router>
  );
};

export default App;