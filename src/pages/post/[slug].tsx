import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { useEffect } from 'react';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import Link from 'next/link';

import { getPrismicClient } from '../../services/prismic';
import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  last_publication_date?: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  previousPost?: { title: string; uid: string };
  nextPost?: { title: string; uid: string };
}

export default function Post({
  post,
  preview,
  previousPost,
  nextPost,
}: PostProps): JSX.Element {
  const words = RichText.asText(
    post.data.content.reduce((acc, content) => acc.concat(content.body), [])
  ).split(' ').length;

  const readingTime = Math.ceil(words / 200); // 200 words read by humans per minute

  const { isFallback } = useRouter();

  useEffect(() => {
    const script = document.createElement('script');
    const anchor = document.getElementById('inject-comments-for-uterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');
    script.setAttribute(
      'repo',
      'giuliana-bezerra/ignite-desafio-01-spacetraveling'
    );
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'github-dark');
    anchor.appendChild(script);
  }, []);

  if (isFallback) return <div>Carregando...</div>;

  return (
    <>
      <Head>
        <title>Posts | Spacetraveling</title>
      </Head>
      <main className={styles.container}>
        <div className={styles.content}>
          <img src={post.data.banner.url} alt="banner" />
          <strong>{post.data.title}</strong>
          <div className={styles.postInfo}>
            <FiCalendar />
            <time>
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <FiUser />
            <span>{post.data.author}</span>
            <FiClock />
            <span>{readingTime} min</span>
            {post.last_publication_date && (
              <span className={styles.editedAt}>
                *editado em {post.last_publication_date}
              </span>
            )}
          </div>
          <div className={styles.body}>
            {post.data.content.map(content => (
              <div key={content.heading}>
                <strong>{content.heading}</strong>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <hr />
        <div className={styles.pagination}>
          {previousPost ? (
            <Link href={`/post/${previousPost.uid}`}>
              <p>
                {previousPost.title}
                <p>Post anterior</p>
              </p>
            </Link>
          ) : (
            <div />
          )}
          {nextPost ? (
            <Link href={`/post/${nextPost.uid}`}>
              <p>
                {nextPost.title}
                <p>Próximo post</p>
              </p>
            </Link>
          ) : (
            <div />
          )}
        </div>
        <div id="inject-comments-for-uterances" />
        {preview && (
          <aside className={commonStyles.previewButton}>
            <Link href="/api/exit-preview">
              <a>Sair do modo Preview</a>
            </Link>
          </aside>
        )}
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      pageSize: 10,
    }
  );

  return {
    paths: posts.results.map(post => {
      return { params: { slug: post.uid } };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;
  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date:
      response.last_publication_date !== response.first_publication_date
        ? format(new Date(response.last_publication_date), 'dd MMM yyyy', {
            locale: ptBR,
          })
        : null,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  const previousPostResponse = await getPrismicClient().query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      after: response.id,
      pageSize: 1,
      orderings: '[document.first_publication_date desc]',
    }
  );

  const previousPost =
    previousPostResponse.results_size > 0
      ? {
          title: previousPostResponse.results[0].data.title,
          uid: previousPostResponse.results[0].uid,
        }
      : null;

  const nextPostResponse = await getPrismicClient().query(
    Prismic.Predicates.at('document.type', 'posts'),
    {
      after: response.id,
      pageSize: 1,
      orderings: '[document.first_publication_date]',
    }
  );
  const nextPost =
    nextPostResponse.results_size > 0
      ? {
          title: nextPostResponse.results[0].data.title,
          uid: nextPostResponse.results[0].uid,
        }
      : null;

  return {
    props: {
      post,
      preview,
      previousPost,
      nextPost,
    },
  };
};
