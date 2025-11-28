import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function setSlackStatus(slackUserId, statusText) {
  try {
    await slack.users.profile.set({
      user: slackUserId,
      profile: {
        status_text: statusText,
        status_emoji: ':palm_tree:',
        status_expiration: 0, // 만료 시간 없음 (수동 또는 cron으로 제거)
      },
    });
    
    console.log(`Set Slack status for user ${slackUserId}: ${statusText}`);
  } catch (error) {
    console.error('Slack set status error:', error);
    throw error;
  }
}

export async function clearSlackStatus(slackUserId) {
  try {
    await slack.users.profile.set({
      user: slackUserId,
      profile: {
        status_text: '',
        status_emoji: '',
      },
    });
    
    console.log(`Cleared Slack status for user ${slackUserId}`);
  } catch (error) {
    console.error('Slack clear status error:', error);
    throw error;
  }
}

// Slack 사용자 ID 찾기 (이메일로 검색)
export async function findSlackUserByEmail(email) {
  try {
    const result = await slack.users.lookupByEmail({ email });
    return result.user.id;
  } catch (error) {
    console.error('Slack user lookup error:', error);
    return null;
  }
}
