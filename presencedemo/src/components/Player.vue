<template>
  <div>
    <span>{{id}} is <span :class="status">{{status}}</span></span>
    <span v-if="isRemote" class="remote"> (remote) </span>
    <button v-if="!isOnline" @click.prevent="connect">Connect</button>
    <template v-if="isConnected && isOnline">
      <button @click.prevent="disconnect">Disconnect</button>
      <span>Last beat: {{ lastInterval }}s ago</span>
      <button v-if="keepAlive" @click.prevent="stopKeepAlive">Stop Heartbeat</button>
    </template>
  </div>
</template>

<script>
import { API } from 'aws-amplify'
import operations from '../graphql/operations'

export default {
  name: 'Player',
  props: {
    id: String
  },
  data() {
    return { 
      status: "offline",
      isConnected: false,
      interval: null,
      currentTime: Date.now(),
      lastBeat: 0,
      keepAlive: false
    };
  },
  computed: {
    isOnline() { return "online" === this.status; },
    isRemote() { return this.isOnline && !this.isConnected },
    lastInterval() {
      return (this.isOnline && this.lastBeat > 0) ? Math.floor((this.currentTime - this.lastBeat) / 1000) : -1;
    }
  },
  methods: {
    // Helper to call API operations on the player id
    api(op) {
      return API.graphql({
        query: op,
        variables: {id: this.id}
      });
    },
    // Send heartbeat and update heartbeat time
    heartbeat() {
      this.api(operations.sendHeartbeat);
      this.lastBeat = Date.now();
    },
    // Switch keepAlive flag
    stopKeepAlive() {
      this.keepAlive = false;
    },
    // Call connect or disconnect depending on online state
    connect() {
      this.api(operations.connect);
      this.lastBeat = Date.now();
      this.keepAlive = this.isConnected = true;
    },
    disconnect() {
      this.api(operations.disconnect);
      this.lastBeat = 0;
      this.keepAlive = this.isConnected = false;
    },
    refresh() {
      if (this.keepAlive && this.lastInterval >= 10) {
        this.heartbeat();
      }
      this.currentTime = Date.now(); // "force" refresh of heartbeat interval
    }
  },
  // Lifecycle Hooks
  async mounted() {
    const result = await this.api(operations.getStatus);
    this.status = result.data.status.status;
    this.api(operations.onStatus).subscribe({
      next: (event) => this.status = event.value.data.onStatus.status
    });
    this.interval = setInterval(()=>this.refresh(), 1000);
  },
  beforeUnmount() {
    clearInterval(this.interval);
  }
}
</script>