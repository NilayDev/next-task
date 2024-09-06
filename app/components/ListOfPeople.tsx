"use client";
import React, { useState, useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

// Define types
interface Person {
  name: string;
  homeworld: string;
}

interface PeopleResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Person[];
}

// Fetch people from SWAPI
const fetchPeople = async ({
  pageParam = 1,
}: {
  pageParam?: number;
}): Promise<PeopleResponse> => {
  const response = await fetch(
    `https://swapi.dev/api/people/?page=${pageParam}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch people");
  }
  return response.json();
};

// Fetch homeworld details
const fetchHomeworld = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch homeworld");
  }
  return response.json();
};

const ListOfPeople = () => {
  const [showHomeworld, setShowHomeworld] = useState<{
    [key: string]: boolean;
  }>({});
  const [loadingHomeworld, setLoadingHomeworld] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data: paginatedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["peoplePaginated"],
    queryFn: fetchPeople,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.next ? parseInt(lastPage.next.split("=")[1]) : undefined,
    staleTime: 5000,
  });

  // IntersectionObserver to auto fetch next page
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    });

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Handle homeworld fetch and cache check
  const handleFetchHomeworld = async (url: string, name: string) => {
    setLoadingHomeworld(name);
    const cachedHomeworld = queryClient.getQueryData(["homeworld", url, name]);

    if (cachedHomeworld) {
      setShowHomeworld((prev) => ({ ...prev, [name]: true }));
    } else {
      await queryClient.prefetchQuery({
        queryKey: ["homeworld", url, name],
        queryFn: () => fetchHomeworld(url),
        staleTime: 1000 * 60 * 10,
      });
      setShowHomeworld((prev) => ({ ...prev, [name]: true }));
    }
    setLoadingHomeworld(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full sm:h-10 sm:w-10 lg:h-12 lg:w-12"></div>
        <p className="text-xl sm:text-2xl lg:text-3xl text-blue-500 ml-4">
          Loading Characters...
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h2 className="text-xl sm:text-2xl lg:text-3xl text-center font-bold my-8">
        List of Characters
      </h2>
      <ul className="space-y-4">
        {paginatedData?.pages.map((page) =>
          page.results.map((person) => {
            const homeworldData = queryClient.getQueryData<{ name: string }>([
              "homeworld",
              person.homeworld,
              person.name,
            ]);

            return (
              <li key={person.name}>
                <div className="border-b pb-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg sm:text-xl lg:text-2xl font-semibold">
                      {person.name}
                    </span>
                    <button
                      onClick={() =>
                        showHomeworld[person.name]
                          ? setShowHomeworld((prev) => ({
                              ...prev,
                              [person.name]: false,
                            }))
                          : handleFetchHomeworld(person.homeworld, person.name)
                      }
                      className="bg-blue-500 text-white w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded hover:bg-blue-600"
                    >
                      {loadingHomeworld === person.name ? (
                        <div className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full"></div>
                      ) : showHomeworld[person.name] ? (
                        "-"
                      ) : (
                        "+"
                      )}
                    </button>
                  </div>
                  {showHomeworld[person.name] && homeworldData?.name && (
                    <div className="mt-1 text-sm sm:text-base lg:text-lg text-gray-600">
                      Homeworld: {homeworldData.name}
                    </div>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
      <div
        ref={loadMoreRef}
        className="h-12 sm:h-16 lg:h-20 bg-gradient-to-r from-gray-100 to-gray-300 text-center text-gray-700 font-medium flex items-center justify-center rounded-lg shadow-md mt-4 animate-pulse"
      >
        {isFetchingNextPage && (
          <span className="text-sm sm:text-base lg:text-lg">
            Loading more...
          </span>
        )}
      </div>
    </div>
  );
};

export default ListOfPeople;
