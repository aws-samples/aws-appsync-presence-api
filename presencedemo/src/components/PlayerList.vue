<template>
  <div>
    <label>Add player: </label>
    <input v-model="id" placeholder="enter player id"/>
    <button @click="add">Add</button>
    <div class="center" v-for="(player, index) in players" :key="index">
      <player :id="player"></player>
    </div>
  </div>
</template>

<script>
import Player from './Player.vue'

export default {
  name: 'PlayerList',
  components: {
    Player
  },
  data() {
    return {
      players: [],
      id: ""
    }
  },
  methods: {
    add: function() {
      if (!this.id) return;
      const index = this.players.findIndex( p => p == this.id );
      if (-1 == index)
        this.players.push(this.id);
    }
  }
}
</script>
