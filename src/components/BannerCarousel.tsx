// teste

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import useEmblaCarousel from "embla-carousel-react";

interface Banner {
    id: string;
    image_url: string;
    title: string | null;
}

const BannerCarousel = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "center" });

    useEffect(() => {
        const fetch = async () => {
            const { data, error } = await supabase
                .from("banners")
                .select("id, image_url, title")
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
                {banners.map((b) => (
                    <div key={b.id} className="min-w-0 shrink-0 grow-0 basis-full">
                        <img
                            src={b.image_url}
                            alt={b.title || "Banner"}
                            className="w-full object-cover aspect-[3/1.2] md:aspect-[3/1]"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BannerCarousel;
