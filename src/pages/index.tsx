import { withUrqlClient, WithUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../generated/graphql";
import { Layout } from "../components/Layout";
import NextLink from "next/link";
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  Stack,
  Text,
} from "@chakra-ui/react";

const Index = () => {
  const [{ data, fetching }] = usePostsQuery({
    variables: { limit: 10 },
  });

  if (!fetching && !data) {
    return <div>you got query failed for some reason</div>;
  }

  return (
    <Layout variant="regular">
      <Flex align="center">
        <Heading>LiReddit</Heading>
        <NextLink href="/create-post">
          <Link ml="auto">create post</Link>
        </NextLink>
      </Flex>
      <br />
      {fetching && !data ? (
        <div>loading...</div>
      ) : (
        <Stack spacing={8}>
          {data.posts.map((p) => (
            <Box key={p.id} p={5} shadow="md" borderWidth="1px">
              <Heading fontSize="xl">{p.title}</Heading>
              <Text mt={4}>{p.textSnippet}</Text>
            </Box>
          ))}
        </Stack>
      )}

      {data ? (
        <Flex>
          <Button m="auto" my={8}>
            load more
          </Button>
        </Flex>
      ) : null}
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
