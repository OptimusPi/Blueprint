import React from "react";
import {
    Anchor,
    Box,
    Center,
    Text,
} from "@mantine/core";

export default function Footer() {
    return (
        <Box
            component="footer"
            p={0}
        >
            <Center w={'100%'} py={{ base: 4, sm: 6 }}>
                <Text ta={'center'} fz={'xs'} c="dimmed" style={{ lineHeight: 1.4 }}>
                    Not affiliated with LocalThunk or PlayStack.{' '}
                    <Anchor fz={'xs'} href="https://playbalatro.com/" target="_blank" rel="noreferrer">
                        BUY Balatro
                    </Anchor>
                    {' '}&bull; Made with ❤️ for the Balatro community.
                </Text>
            </Center>
        </Box>
    )
}
