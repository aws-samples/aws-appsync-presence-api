<template>
  <div>
    <h1>Presence API Demo</h1>
    <player-list></player-list>
  </div>
</template>

<script>
import PlayerList from './components/PlayerList.vue'

export default {
  name: 'App',
  components: {
    PlayerList
  }
}
</script>
