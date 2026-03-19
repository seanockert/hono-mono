import { createApp } from 'vue';
import './style.css'; // Import global styles
import App from './App.vue';
import { router } from './router';

createApp(App).use(router).mount('#app');
