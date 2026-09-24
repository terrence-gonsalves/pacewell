import { Image, ImageStyle, StyleProp } from 'react-native';

type PacewellLogoProps = {
    size?: number;
    variant?: 'green' | 'white';
    style?: StyleProp<ImageStyle>;
};

export default function PacewellLogo({
    size = 40,
    variant = 'green',
    style,
}: PacewellLogoProps) {
    const source =
        variant === 'white'
            ? require('../../assets/branding/pacewell-logo-white-transparent.png')
            : require('../../assets/branding/pacewell-logo-green-transparent.png');

    return (
        <Image
            source={source}
            style={[
                {
                    width: size,
                    height: size,
                },
                style,
            ]}
            resizeMode="contain"
        />
    );
}