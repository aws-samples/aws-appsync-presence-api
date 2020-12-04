<template>
  <div>
    <h1>Presence API Demo</h1>
    <player-list></player-list>
    <div class="footer">
      <a hrel="https://aws.amazon.com/gametech">
        <img class="logo" alt="AWS Game Tech logo" src="./assets/game_tech.png" />
      </a>
    </div>
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
