import * as core from '@actions/core'
import {
  logDebug,
  logInfo,
  logHighlight,
  sleep,
  Runner,
  VM,
  StartVMRequest,
  INSTANCE_STATE_STARTED,
  INSTANCE_STATE_PULLING
} from 'anka-actions-common'

export type ActionParams = {
  ghOwner: string
  ghRepo: string
  ghBaseUrl: string
  ghPAT: string

  templateId: string
  templateTag?: string
  templateRunnerDir: string

  baseUrl: string

  rootToken?: string

  httpsAgentCa?: string
  httpsAgentCert?: string
  httpsAgentPassphrase?: string
  httpsAgentSkipCertVerify?: boolean
  httpsAgentKey?: string

  pollDelay: number
  hardTimeout: number

  vcpu?: number
  vram?: number
  group_id?: string
  node_id?: string
}

// Repo-scoped registration tokens require the repository web URL in config.sh.
export function getRunnerRegistrationUrl(
  ghBaseUrl: string,
  ghOwner: string,
  ghRepo: string
): string {
  let webBaseUrl = ghBaseUrl.split('/api')[0]
  if (ghBaseUrl.match(/api\.github\.com/)) {
    webBaseUrl = 'https://github.com'
  }
  return `${webBaseUrl}/${ghOwner}/${ghRepo}`
}

export async function doAction(
  actionId: string,
  runner: Runner,
  vm: VM,
  params: ActionParams
): Promise<void> {
  const token = await runner.createToken()

  const registrationUrl = getRunnerRegistrationUrl(
    params.ghBaseUrl,
    params.ghOwner,
    params.ghRepo
  )

  const vmConfig: StartVMRequest = {
    count: 1,
    vmid: params.templateId,
    tag: params.templateTag,
    vcpu: params.vcpu,
    vram: params.vram,
    group_id: params.group_id,
    node_id: params.node_id,
    startup_script: Buffer.from(
      `set -exo pipefail; \
      cd ${params.templateRunnerDir}; \
      ./config.sh --url "${registrationUrl}" --token "${token}" --labels "${actionId}" --runnergroup "Default" --name "${actionId}" --work "_work" --unattended --ephemeral --replace; \
      ./svc.sh install; \
      ./svc.sh start;
      `,
      'binary'
    ).toString('base64'),
    script_monitoring: true,
    script_fail_handler: 1,
    external_id: actionId
  }

  logInfo(
    `[VM] starting new instance with ${logHighlight('External ID', actionId)}`
  )
  const instanceId = await vm.start(
    actionId,
    registrationUrl,
    token,
    params.templateRunnerDir,
    vmConfig
  )

  core.setOutput('action-id', actionId)

  let vmState = ''
  logInfo(`[VM] waiting for the VM instance to start...`)
  do {
    const vmStatus = await vm.getState(instanceId)
    vmState = vmStatus.instanceState
    const progressSuffix =
      vmState === INSTANCE_STATE_PULLING && vmStatus.progress !== undefined
        ? ` (${Math.round(vmStatus.progress * 100)}%)`
        : ''
    logInfo(`[VM] state: ${vmState}${progressSuffix}`)
    if (vmState !== INSTANCE_STATE_STARTED) {
      await sleep(params.pollDelay * 1000)
    }
  } while (vmState !== INSTANCE_STATE_STARTED)

  let runnerId: number | null = null
  logInfo(`[Action Runner] waiting for the Github action runner to register...`)
  do {
    runnerId = await runner.getRunnerByName(actionId)
    if (runnerId === null) {
      logInfo(`[Action Runner] has not yet been registered`)
      await sleep(params.pollDelay * 1000)
    } else {
      logInfo(
        `[Action Runner] with ${logHighlight(
          'name',
          actionId
        )} and ${logHighlight('id', runnerId)} has been registered`
      )
    }
  } while (runnerId === null)
}

export async function parseParams(): Promise<ActionParams> {
  const pollDelay: number = parseInt(
    core.getInput('controller-http-poll-delay', {required: true}),
    10
  )
  if (isNaN(pollDelay) || pollDelay <= 0)
    throw new Error('controller-http-poll-delay must be positive integer')

  const hardTimeout: number = parseInt(
    core.getInput('job-ttl', {required: true}),
    10
  )
  if (isNaN(hardTimeout) || hardTimeout < 0)
    throw new Error('job-ttl must be greater then or equal to 0')

  const ghOwner = core.getInput('gh-owner', {required: true})

  const params: ActionParams = {
    ghBaseUrl: core.getInput('gh-base-url'),
    ghOwner,
    ghRepo: core
      .getInput('gh-repository', {required: true})
      .replace(`${ghOwner}/`, ''),
    ghPAT: core.getInput('gh-pat', {required: true}),

    templateId: core.getInput('template-id', {required: true}),
    templateRunnerDir: core.getInput('template-runner-dir', {
      required: true
    }),

    baseUrl: core.getInput('controller-url', {required: true}),

    rootToken: core.getInput('controller-root-token'),

    pollDelay,
    hardTimeout
  }

  if (!params.ghBaseUrl.match('github.com') && !params.ghBaseUrl.match('/api/'))
    throw new Error('gh-base-urls must include /api/v3')

  const templateTag = core.getInput('template-tag')
  if (templateTag) {
    params.templateTag = templateTag
  }

  const httpsAgentCa = core.getInput('controller-tls-ca')
  if (httpsAgentCa) {
    params.httpsAgentCa = httpsAgentCa
  }

  const httpsAgentCert = core.getInput('controller-auth-cert')
  if (httpsAgentCert) {
    params.httpsAgentCert = httpsAgentCert
  }

  const httpsAgentKey = core.getInput('controller-auth-cert-key')
  if (httpsAgentKey) {
    params.httpsAgentKey = httpsAgentKey
  }

  const httpsAgentPassphrase = core.getInput('controller-auth-cert-passphrase')
  if (httpsAgentPassphrase) {
    params.httpsAgentPassphrase = httpsAgentPassphrase
  }

  const httpsAgentSkipCertVerify = core.getBooleanInput(
    'controller-https-skip-cert-verify'
  )
  if (httpsAgentSkipCertVerify) {
    params.httpsAgentSkipCertVerify = httpsAgentSkipCertVerify
  }

  const vcpu = core.getInput('vcpu')
  if (vcpu) {
    const vcpuNum = parseInt(vcpu, 10)
    if (isNaN(vcpuNum) || vcpuNum <= 0)
      throw new Error('vcpu must be positive integer')
    params.vcpu = vcpuNum
  }

  const vram = core.getInput('vram')
  if (vram) {
    const vramNum = parseInt(vram, 10)
    if (isNaN(vramNum) || vramNum <= 0)
      throw new Error('vram must be positive integer')
    params.vram = vramNum
  }

  const groupId = core.getInput('group-id')
  if (groupId) {
    params.group_id = groupId
  }

  const nodeId = core.getInput('node-id')
  if (nodeId) {
    params.node_id = nodeId
  }

  logDebug(`Parsed params: ${JSON.stringify(params)}`)
  return params
}
