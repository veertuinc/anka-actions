import * as axios from 'axios'
import {logDebug} from './log'

interface GitHubRunner {
  id: number
  name: string
}

interface ListRunnersResponse {
  total_count: number
  runners: GitHubRunner[]
}

interface RegistrationTokenResponse {
  token: string
  expires_at: string
}

const RUNNERS_PER_PAGE = 100

export class Runner {
  private client: axios.AxiosInstance
  private owner: string
  private repo: string

  constructor(ghPAT: string, ghBaseUrl: string, owner: string, repo: string) {
    this.owner = owner
    this.repo = repo
    this.client = axios.default.create({
      baseURL: ghBaseUrl,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `token ${ghPAT}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  }

  // Shared base path for the repository self-hosted runner endpoints.
  private runnersPath(): string {
    return `/repos/${this.owner}/${this.repo}/actions/runners`
  }

  async getRunnerByName(name: string): Promise<number | null> {
    let page = 1
    let collected = 0
    let totalCount = 0

    do {
      const response = await this.client.get<ListRunnersResponse>(
        this.runnersPath(),
        {params: {per_page: RUNNERS_PER_PAGE, page}}
      )
      logDebug(
        `listSelfHostedRunners page ${page}: ${JSON.stringify(response.data)}`
      )

      totalCount = response.data.total_count
      const {runners} = response.data

      const found = runners.find(runner => runner.name === name)
      if (found) {
        return found.id
      }

      collected += runners.length
      page++

      if (runners.length === 0) {
        break
      }
    } while (collected < totalCount)

    return null
  }

  async createToken(): Promise<string> {
    const response = await this.client.post<RegistrationTokenResponse>(
      `${this.runnersPath()}/registration-token`
    )
    logDebug(`createRegistrationToken: ${JSON.stringify(response.data)}`)

    return response.data.token
  }

  async delete(runnerId: number): Promise<void> {
    await this.client.delete(`${this.runnersPath()}/${runnerId}`)
  }
}
