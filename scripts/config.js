import process from 'node:process'

export const weeekApiConfig = {
    weeekApiKey: process.env.WEEEK_API_KEY,
}

export const githubApiConfig = {
    githubToken: process.env.GITHUB_TOKEN,
    githubRepository: process.env.GITHUB_REPOSITORY,
}

export const techConfig = {
    // tech
    isDebug: Boolean(+process.env.RUNNER_DEBUG)
}

export function validateConfig(config) {
    Object.keys(config).forEach((key) => {
        const value = config[key]
        if (value == null) {
            throw new Error(`${key} is not set. Make sure it's available in the workflow.`)
        }
    })
}