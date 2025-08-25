import { githubApiConfig as config } from '../utils/config.js'
import { logDebug } from '../utils/log.js'

async function fetchGithub(endpoint, options = {}) {
  const url = `https://api.github.com/repos/${config.githubRepository}${endpoint}`
  const headers = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${config.githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })
  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`GitHub API error. \n Url: ${url} \n Options: ${JSON.stringify(options, null, 2)} \n Status: ${response.status} \n Body: ${errorBody}`)
  }
  return response.json()
}

export async function updatePr(prNumber, body) {
  logDebug(`Updating PR ${prNumber} with body: ${JSON.stringify(body, null, 2)}`)

  return fetchGithub(`/pulls/${prNumber}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function createIssueComment(issueNumber, body) {
  logDebug(`Create Issue Comment ${issueNumber} with body: ${JSON.stringify(body, null, 2)}`)

  return fetchGithub(`/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
