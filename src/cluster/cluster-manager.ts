import { spawn, type Subprocess } from 'bun'
import { cpus } from 'os'
import type { Logger } from '../interfaces/logger'
import type { ClusterConfig } from '../interfaces/gateway'

export interface WorkerInfo {
  id: number
  process: Subprocess
  restarts: number
  lastRestartTime: number
  isExiting: boolean
}

export class ClusterManager {
  private config: ClusterConfig
  private logger?: Logger
  private workers: Map<number, WorkerInfo> = new Map()
  private nextWorkerId = 1
  private isShuttingDown = false
  private workerScript: string

  constructor(config: ClusterConfig, logger?: Logger, workerScript?: string) {
    this.config = {
      enabled: true,
      workers: cpus().length,
      restartWorkers: true,
      maxRestarts: 10,
      restartDelay: 1000,
      shutdownTimeout: 30000,
      respawnThreshold: 5,
      respawnThresholdTime: 60000,
      ...config,
    }
    this.logger = logger
    this.workerScript = workerScript || process.argv[1] || 'worker.js'
  }

  async start(): Promise<void> {
    if (!this.config.enabled) {
      this.logger?.info('Cluster mode disabled')
      return
    }

    this.logger?.info(`Starting cluster with ${this.config.workers} workers`)

    // Set up signal handlers
    process.on('SIGINT', this.gracefulShutdown.bind(this))
    process.on('SIGTERM', this.gracefulShutdown.bind(this))
    process.on('SIGUSR2', this.restartAllWorkers.bind(this))

    // Spawn workers
    for (let i = 0; i < this.config.workers!; i++) {
      await this.spawnWorker()
    }

    this.logger?.info('Cluster started successfully')
  }

  private async spawnWorker(): Promise<void> {
    const workerId = this.nextWorkerId++

    try {
      const worker = spawn({
        cmd: [process.execPath, this.workerScript],
        env: {
          ...process.env,
          CLUSTER_WORKER: 'true',
          CLUSTER_WORKER_ID: workerId.toString(),
        },
        stdio: ['inherit', 'inherit', 'inherit'],
      })

      const workerInfo: WorkerInfo = {
        id: workerId,
        process: worker,
        restarts: 0,
        lastRestartTime: 0,
        isExiting: false,
      }

      this.workers.set(workerId, workerInfo)

      // Handle worker exit
      worker.exited.then((exitCode) => {
        this.handleWorkerExit(workerInfo, exitCode)
      })

      this.logger?.info(`Worker ${workerId} started (PID: ${worker.pid})`)
    } catch (error) {
      this.logger?.error(`Failed to spawn worker ${workerId}:`, error as Error)
      throw error
    }
  }

  private async handleWorkerExit(
    workerInfo: WorkerInfo,
    exitCode: number,
  ): Promise<void> {
    const { id, isExiting } = workerInfo

    this.logger?.warn(`Worker ${id} exited with code ${exitCode}`)
    this.workers.delete(id)

    // Don't restart if we're shutting down or worker was intentionally killed
    if (this.isShuttingDown || isExiting) {
      return
    }

    // Check if we should restart the worker
    if (this.config.restartWorkers && this.shouldRestartWorker(workerInfo)) {
      this.logger?.info(`Restarting worker ${id}`)
      workerInfo.restarts++
      workerInfo.lastRestartTime = Date.now()

      // Add restart delay
      await new Promise((resolve) =>
        setTimeout(resolve, this.config.restartDelay),
      )

      try {
        await this.spawnWorker()
      } catch (error) {
        this.logger?.error(`Failed to restart worker ${id}:`, error as Error)
      }
    } else {
      this.logger?.warn(
        `Worker ${id} will not be restarted (max restarts reached or respawn threshold exceeded)`,
      )
    }
  }

  private shouldRestartWorker(workerInfo: WorkerInfo): boolean {
    const { restarts, lastRestartTime } = workerInfo
    const now = Date.now()

    // Check max restarts
    if (restarts >= this.config.maxRestarts!) {
      return false
    }

    // Check respawn threshold
    if (this.config.respawnThreshold && this.config.respawnThresholdTime) {
      const timeSinceLastRestart = now - lastRestartTime
      if (
        timeSinceLastRestart < this.config.respawnThresholdTime &&
        restarts >= this.config.respawnThreshold
      ) {
        return false
      }
    }

    return true
  }

  private async restartAllWorkers(): Promise<void> {
    this.logger?.info('Restarting all workers')

    const workerIds = Array.from(this.workers.keys())

    for (const workerId of workerIds) {
      const workerInfo = this.workers.get(workerId)
      if (workerInfo) {
        this.logger?.info(`Restarting worker ${workerId}`)
        workerInfo.isExiting = true
        workerInfo.process.kill('SIGTERM')

        // Wait a bit before starting the next restart
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  private async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger?.warn('Shutdown already in progress')
      return
    }

    this.isShuttingDown = true
    this.logger?.info('Shutting down cluster...')

    const workerIds = Array.from(this.workers.keys())

    if (workerIds.length === 0) {
      this.logger?.info('No workers to shutdown')
      process.exit(0)
      return
    }

    // Send SIGTERM to all workers
    for (const workerId of workerIds) {
      const workerInfo = this.workers.get(workerId)
      if (workerInfo) {
        workerInfo.isExiting = true
        this.logger?.info(`Sending SIGTERM to worker ${workerId}`)
        workerInfo.process.kill('SIGTERM')
      }
    }

    // Wait for workers to exit gracefully
    const shutdownPromise = new Promise<void>((resolve) => {
      const checkWorkers = () => {
        if (this.workers.size === 0) {
          resolve()
        } else {
          setTimeout(checkWorkers, 100)
        }
      }
      checkWorkers()
    })

    // Force kill workers if they don't exit within timeout
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.workers.size > 0) {
          this.logger?.warn('Force killing remaining workers')
          for (const [workerId, workerInfo] of this.workers) {
            this.logger?.warn(`Force killing worker ${workerId}`)
            workerInfo.process.kill('SIGKILL')
          }
        }
        resolve()
      }, this.config.shutdownTimeout)
    })

    await Promise.race([shutdownPromise, timeoutPromise])

    this.logger?.info('Cluster shutdown complete')
    process.exit(0)
  }

  getWorkerCount(): number {
    return this.workers.size
  }

  getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values())
  }
}
