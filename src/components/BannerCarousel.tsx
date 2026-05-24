import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import useEmblaCarousel from "embla-carousel-react";

interface Banner {
    id: string;
    image_url: string;
    title: string | null;
    link: string | null;
}

function normalizeBannerHref(link: string | null | undefined): string | null {
    const t = link?.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
}

const BannerCarousel = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });

    useEffect(() => {
        const fetch = async () => {
            const { data, error } = await supabase
                .from("banners")
                .select("id, image_url, title, link")
                .eq("is_active", true)
                .order("display_order");
            if (data && data.length > 0) setBanners(data);
        };
        fetch();
    }, []);

    // Auto-scroll
    useEffect(() => {
        if (!emblaApi || banners.length <= 1) return;
        const interval = setInterval(() => {
            emblaApi.scrollNext();
        }, 4000);
        return () => clearInterval(interval);
    }, [emblaApi, banners.length]);

    if (banners.length === 0) return null;

    return (
        <div className="w-full overflow-hidden" ref={emblaRef}>
            <div className="flex">
                {banners.map((b) => {
                    const href = normalizeBannerHref(b.link);
                    const img = (
                        <img
                            src={b.image_url}
                            alt={b.title || "Banner"}
                            className="w-full object-contain aspect-[3/1.2] md:aspect-[3/1]"
                        />
                    );
                    return (
                        <div key={b.id} className="min-w-0 shrink-0 grow-0 basis-full">
                            {href ? (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {img}
                                </a>
                            ) : (
                                img
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BannerCarousel;
