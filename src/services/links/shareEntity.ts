import { Share } from 'react-native';
import { buildShareMessage, buildShareUrl, type ShareEntityType } from '../../utils/shareLinks';

/**
 * Opens the system share sheet with the permanent entity URL. The link is placed in `message` because
 * Android's Share ignores `url`; iOS also receives `url` so it renders as a link preview.
 */
export async function shareEntity(type: ShareEntityType, id: string, lead: string): Promise<void> {
  try {
    await Share.share({
      message: buildShareMessage(lead, type, id),
      url: buildShareUrl(type, id),
    });
  } catch (error) {
    console.warn('Error sharing', type, error);
  }
}
