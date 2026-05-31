import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import useEmblaCarousel from "embla-carousel-react";

interface Banner {
    id: string;
    image_url: string;
    title: string | null;
    link: string | null;
}

const EMAIL_SUBJECT = "Divulga";
const EMAIL_BODY = "Quero saber mais como divulgar minha marca";

const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

interface BannerLink {
    href: string;
    isEmail: boolean;
}

function normalizeBannerHref(link: string | null | undefined): BannerLink | null {
    const t = link?.trim();
    if (!t) return null;

    // Se for um link http/https, abre a página normalmente.
    if (/^https?:\/\//i.test(t)) return { href: t, isEmail: false };

    // Se contiver um e-mail (@gmail.com ou afins), redireciona para abertura de e-mail.
    const emailMatch = t.match(EMAIL_REGEX);
    if (emailMatch) {
        const email = emailMatch[0];
        const href = `mailto:${email}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(EMAIL_BODY)}`;
        return { href, isEmail: true };
    }

    return { href: `https://${t}`, isEmail: false };
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
                    const bannerLink = normalizeBannerHref(b.link);
                    const img = (
                        <img
                            src={b.image_url}
                            alt={b.title || "Banner"}
                            className="w-full object-contain aspect-[3/1.2] md:aspect-[3/1]"
                        />
                    );
                    return (
                        <div key={b.id} className="min-w-0 shrink-0 grow-0 basis-full">
                            {bannerLink ? (
                                <a
                                    href={bannerLink.href}
                                    target={bannerLink.isEmail ? undefined : "_blank"}
                                    rel={bannerLink.isEmail ? undefined : "noopener noreferrer"}
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
