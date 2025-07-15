import { Linking } from 'react-native';

export const openWhatsApp = async (
  number: string,
  templateMessage: string,
): Promise<void> => {
  const url = `whatsapp://send?phone=${number}&text=${encodeURIComponent(
    templateMessage,
  )}`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.log(
        'WhatsApp is not installed on this device. Opening web link.',
      );
      await Linking.openURL(
        `https://wa.me/${number}?text=${encodeURIComponent(templateMessage)}`,
      );
    }
  } catch (error) {
    console.error('An error occurred while trying to open WhatsApp:', error);
  }
};
