import { mount } from 'svelte';
import App from './ui/App.svelte';
import { apparence } from './etat/theme.svelte.js';
import './ui/global.css';

// Avant le montage : évite que l'interface s'affiche en clair une fraction de
// seconde chez qui a choisi le thème sombre.
apparence.appliquer();

export default mount(App, { target: document.getElementById('app')! });
