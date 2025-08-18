import process from 'node:process'
import {getWeeekTask, getWeeekWorkspace, updateWeeekTask} from "./api/weeek-api";
import {createIssueComment, updatePr} from "./api/github-api";
import {githubApiConfig, techConfig, validateConfig, weeekApiConfig} from "./config";

const extractTaskId = branch => branch.match(/weee?k-?(\d+)/i)?.[1]

export const config = {
    // weeek
    ...weeekApiConfig,
    weeekCustomGithubFieldId: '9f915b6a-01e4-4351-b8e7-a3550e4f4335',
    // github
    ...githubApiConfig,
    githubPrUrl: process.env.GITHUB_PR_URL,
    githubPrNumber: process.env.GITHUB_PR_NUMBER,
    githubBranchName: process.env.GITHUB_BRANCH_NAME,
    // tech
    ...techConfig
}

function getWeeekTaskId() {
  const branchName = config.githubBranchName

  const taskId = extractTaskId(branchName)
  if (!taskId) {
    console.log(`No task ID found in branch name: ${branchName}. Skipping update.`)
  }
  return taskId
}

async function main() {
  const baseExceptionText = '❌ Error in PR weeek integration:'
  try {
    let exceptionCount = 0
    validateConfig()

    const taskId = getWeeekTaskId()
    if (!taskId) return

    try {
      await updateWeeekTask(taskId, {
          customFields: {[config.weeekCustomGithubFieldId]: config.githubPrUrl},
      })
    }
    catch (error) {
      exceptionCount++
      console.error(baseExceptionText, 'updateWeeekTask', error)
    }

    const task = await getWeeekTask(taskId)

    const ws = await getWeeekWorkspace()

    const newTitle = `[WEEEK-${taskId}] ${task.title}`
    const weeekTaskLink = `https://app.weeek.net/ws/${ws.id}/task/${taskId}`

    try {
      await updatePr(config.githubPrNumber, { title: newTitle })
    }
    catch (error) {
      exceptionCount++
      console.error(baseExceptionText, 'updatePr', error)
    }

    try {
      await createIssueComment(config.githubPrNumber, { body: `[${newTitle}](${weeekTaskLink})` })
    }
    catch (error) {
      exceptionCount++
      console.error(baseExceptionText, 'createIssueComment', error)
    }

    if (exceptionCount > 0) {
      process.exit(1)
    }
  }
  catch (error) {
    console.error(baseExceptionText, error)
    process.exit(1)
  }
}

main()
