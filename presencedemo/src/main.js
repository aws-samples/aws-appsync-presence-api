import { createApp } from 'vue'
import App from './App.vue'
import './index.css'

import Amplify from 'aws-amplify';
import config from './api-config';

Amplify.configure(config);

createApp(App).mount('#app')
