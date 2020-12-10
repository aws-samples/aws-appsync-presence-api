/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
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
